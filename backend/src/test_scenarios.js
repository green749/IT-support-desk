import "./config/env.js";
import "./models/associations.js";
import sequelize, { connectDatabase } from "./config/database.js";
import { connectMongoDB } from "./config/mongodb.js";
import { User, Ticket, TicketCategory, AgentCategory, TicketReply } from "./models/associations.js";
import { seedCategories } from "./utils/seedCategories.js";
import { migrateSchema } from "./utils/migrateSchema.js";
import { handleTicketAutoAssignment, getEligibleAgentsWithWorkload } from "./services/ticketAssignment.service.js";
import { hashPassword } from "./utils/password.js";

async function runTests() {
  console.log("==================================================");
  console.log("STARTING ITDESK COMPREHENSIVE VERIFICATION SUITE");
  console.log("==================================================\n");

  try {
    await connectDatabase();
    await migrateSchema();
    await sequelize.sync();
    await seedCategories();
    await connectMongoDB();

    let passedTests = 0;
    let failedTests = 0;

    function assert(condition, message) {
      if (condition) {
        console.log(`[PASS] ${message}`);
        passedTests++;
      } else {
        console.error(`[FAIL] ${message}`);
        failedTests++;
      }
    }

    // Mock global.io for socket event assertions
    const emittedEvents = [];
    global.io = {
      to: (room) => ({
        emit: (event, payload) => {
          emittedEvents.push({ room, event, payload });
        },
      }),
      in: (room) => ({
        fetchSockets: async () => [],
      }),
    };

    // Cleanup test users and tickets
    const testEmailPrefix = `test_itdesk_${Date.now()}`;
    const defaultPasswordHash = await hashPassword("Password123!");

    // Helper to create test user
    async function createTestUser(name, emailSuffix, role = "customer", isActive = true) {
      return User.create({
        name,
        email: `${testEmailPrefix}_${emailSuffix}@company.com`,
        passwordHash: defaultPasswordHash,
        role,
        isActive,
      });
    }

    const testAdmin = await createTestUser("Admin User", "admin", "admin");
    const testEmployee = await createTestUser("Arun Employee", "emp", "customer");
    const testAgent1 = await createTestUser("Agent Arun", "agent1", "agent");
    const testAgent2 = await createTestUser("Agent Rahul", "agent2", "agent");
    const testAgent3 = await createTestUser("Agent Priya", "agent3", "agent");

    // Fetch categories
    const vpnCat = await TicketCategory.findOne({ where: { key: "vpn" } });
    const networkCat = await TicketCategory.findOne({ where: { key: "network" } });
    const securityCat = await TicketCategory.findOne({ where: { key: "security" } });
    const otherCat = await TicketCategory.findOne({ where: { key: "other" } });

    assert(vpnCat && networkCat && securityCat && otherCat, "All standard IT support categories exist in database");

    // ----------------------------------------------------------------
    // TEST 1: Registration Role Default
    // ----------------------------------------------------------------
    console.log("\n--- TEST 1: Registration Role Default ---");
    assert(testEmployee.role === "customer", "New user is registered as customer (Employee) by default");

    // ----------------------------------------------------------------
    // TEST 2: Admin Assigns Support Categories to Agent
    // ----------------------------------------------------------------
    console.log("\n--- TEST 2: Admin Assigns Support Categories to Agent ---");
    // Assign VPN and Network to Agent Arun (Agent 1)
    await AgentCategory.bulkCreate([
      { agentId: testAgent1.id, categoryId: vpnCat.id },
      { agentId: testAgent1.id, categoryId: networkCat.id },
    ]);

    const arunCategories = await AgentCategory.findAll({ where: { agentId: testAgent1.id } });
    assert(arunCategories.length === 2, "Agent Arun successfully mapped to VPN and Network categories");

    // ----------------------------------------------------------------
    // TEST 3: Demoting Agent Removes Category Mappings
    // ----------------------------------------------------------------
    console.log("\n--- TEST 3: Demoting Agent Removes Category Mappings ---");
    const tempAgent = await createTestUser("Temp Agent", "temp_agent", "agent");
    await AgentCategory.create({ agentId: tempAgent.id, categoryId: vpnCat.id });
    assert((await AgentCategory.count({ where: { agentId: tempAgent.id } })) === 1, "Temp agent has 1 category");

    // Demote to customer
    await AgentCategory.destroy({ where: { agentId: tempAgent.id } });
    await tempAgent.update({ role: "customer" });
    assert((await AgentCategory.count({ where: { agentId: tempAgent.id } })) === 0, "Demoted agent categories are removed");

    // ----------------------------------------------------------------
    // TEST 4: Exactly One Matching Agent -> Automatic Assignment
    // ----------------------------------------------------------------
    console.log("\n--- TEST 4: Exactly One Matching Agent (Automatic Assignment) ---");
    emittedEvents.length = 0;

    const networkTicket = await Ticket.create({
      title: "Office switch port down",
      description: "Network connectivity dropped in Room 204",
      category: networkCat.name,
      categoryId: networkCat.id,
      priority: "high",
      customerId: testEmployee.id,
      status: "open",
    });

    const autoResult1 = await handleTicketAutoAssignment(networkTicket, networkCat);
    assert(autoResult1.assigned === true, "Network ticket was automatically assigned");
    assert(Number(networkTicket.assignedAgentId) === Number(testAgent1.id), "Ticket assigned to the single matching agent (Agent Arun)");
    assert(networkTicket.status === "assigned", "Ticket status changed to 'assigned'");

    const agentNotification = emittedEvents.find(e => e.room === `user:${testAgent1.id}` && e.event === "ticket_assigned");
    assert(agentNotification !== undefined, "Agent Arun received real-time ticket_assigned socket notification");

    const adminAlertForSingle = emittedEvents.find(e => e.event === "ticket_assignment_required");
    assert(adminAlertForSingle === undefined, "Admin did NOT receive assignment-required alert when auto-assigned");

    // ----------------------------------------------------------------
    // TEST 5: Multiple Matching Agents -> Admin Manual Assignment Required
    // ----------------------------------------------------------------
    console.log("\n--- TEST 5: Multiple Matching Agents (Admin Manual Assignment Required) ---");
    // Assign VPN to Agent Rahul and Agent Priya as well (Arun, Rahul, Priya all have VPN)
    await AgentCategory.create({ agentId: testAgent2.id, categoryId: vpnCat.id });
    await AgentCategory.create({ agentId: testAgent3.id, categoryId: vpnCat.id });

    emittedEvents.length = 0;

    const vpnTicket = await Ticket.create({
      title: "VPN handshake failure",
      description: "Cannot connect to corporate VPN from home",
      category: vpnCat.name,
      categoryId: vpnCat.id,
      priority: "high",
      customerId: testEmployee.id,
      status: "open",
    });

    const autoResult2 = await handleTicketAutoAssignment(vpnTicket, vpnCat);
    assert(autoResult2.assigned === false, "Multiple matching agents -> ticket remains unassigned");
    assert(vpnTicket.assignedAgentId == null, "Ticket assignedAgentId is null");
    assert(vpnTicket.status === "open", "Ticket status remains 'open'");

    const adminRequiredEvent = emittedEvents.find(e => e.room === "admins" && e.event === "ticket_assignment_required");
    assert(adminRequiredEvent !== undefined, "Admin received ticket_assignment_required socket event");
    assert(adminRequiredEvent?.payload?.matchingAgents?.length === 3, "Payload contains 3 matching IT agents");

    // Workload check
    const eligibleWithWorkload = await getEligibleAgentsWithWorkload(vpnCat.id);
    assert(eligibleWithWorkload.length === 3, "getEligibleAgentsWithWorkload returns 3 eligible agents");
    assert(eligibleWithWorkload.some(a => a.name === "Agent Arun"), "Arun is in eligible agents list with active workload count");

    // Admin manual assignment
    await vpnTicket.update({ assignedAgentId: testAgent2.id, status: "assigned" });
    assert(Number(vpnTicket.assignedAgentId) === Number(testAgent2.id), "Admin successfully manually assigned ticket to Agent Rahul");
    assert(vpnTicket.status === "assigned", "Ticket status updated to 'assigned' on admin manual assign");

    // ----------------------------------------------------------------
    // TEST 6: Zero Matching Agents -> Manual Assignment Required
    // ----------------------------------------------------------------
    console.log("\n--- TEST 6: Zero Matching Agents (Manual Assignment Required) ---");
    emittedEvents.length = 0;

    const securityTicket = await Ticket.create({
      title: "Phishing email reported",
      description: "Received suspicious payroll update email",
      category: securityCat.name,
      categoryId: securityCat.id,
      priority: "critical",
      customerId: testEmployee.id,
      status: "open",
    });

    const autoResult3 = await handleTicketAutoAssignment(securityTicket, securityCat);
    assert(autoResult3.assigned === false, "0 matching agents -> ticket remains unassigned");
    assert(securityTicket.assignedAgentId == null, "Security ticket remains unassigned");

    const noAgentAdminAlert = emittedEvents.find(e => e.room === "admins" && e.event === "ticket_assignment_required");
    assert(noAgentAdminAlert !== undefined, "Admin received manual assignment alert for 0 matching agents");

    // ----------------------------------------------------------------
    // TEST 7: 'Other' Category -> Always Manual Assignment
    // ----------------------------------------------------------------
    console.log("\n--- TEST 7: 'Other' Category (Always Manual Assignment) ---");
    emittedEvents.length = 0;

    const otherTicket = await Ticket.create({
      title: "Desk ergonomic chair arm broken",
      description: "Need replacement chair part",
      category: otherCat.name,
      categoryId: otherCat.id,
      priority: "low",
      customerId: testEmployee.id,
      status: "open",
    });

    const autoResult4 = await handleTicketAutoAssignment(otherTicket, otherCat);
    assert(autoResult4.assigned === false, "'Other' category ticket is never automatically assigned");
    assert(otherTicket.assignedAgentId == null, "'Other' ticket assignedAgentId is null");

    // ----------------------------------------------------------------
    // TEST 8: Inactive Agent Ignored
    // ----------------------------------------------------------------
    console.log("\n--- TEST 8: Inactive Agent Ignored During Auto-Matching ---");
    const inactiveAgent = await createTestUser("Inactive Specialist", "inactive_agent", "agent", false);
    const emailCat = await TicketCategory.findOne({ where: { key: "email" } });
    await AgentCategory.create({ agentId: inactiveAgent.id, categoryId: emailCat.id });

    const emailTicket = await Ticket.create({
      title: "Outlook sync issue",
      description: "Mailbox not syncing",
      category: emailCat.name,
      categoryId: emailCat.id,
      priority: "medium",
      customerId: testEmployee.id,
      status: "open",
    });

    const autoResult5 = await handleTicketAutoAssignment(emailTicket, emailCat);
    assert(autoResult5.assigned === false, "Inactive agent is ignored; ticket remains unassigned");
    assert(emailTicket.assignedAgentId == null, "Ticket assignedAgentId is null when only matching agent is inactive");

    // ----------------------------------------------------------------
    // TEST 9 & 10: Ticket Conversation & Internal Note Privacy
    // ----------------------------------------------------------------
    console.log("\n--- TEST 9 & 10: Ticket Conversation & Internal Note Privacy ---");
    const publicReply = await TicketReply.create({
      ticketId: vpnTicket.id,
      userId: testAgent2.id,
      message: "Please clear your DNS cache and restart your VPN client.",
      isInternal: false,
    });

    const internalNote = await TicketReply.create({
      ticketId: vpnTicket.id,
      userId: testAgent2.id,
      message: "Internal IT Note: Checked RADIUS log; certificate expired on gateway 3.",
      isInternal: true,
    });

    assert(publicReply.isInternal === false, "Public reply created with isInternal = false");
    assert(internalNote.isInternal === true, "Internal note created with isInternal = true");

    // Verify employee view filters out internal note
    const allReplies = await TicketReply.findAll({ where: { ticketId: vpnTicket.id } });
    const employeeVisibleReplies = allReplies.filter(r => !r.isInternal);
    assert(employeeVisibleReplies.length === 1 && employeeVisibleReplies[0].id === publicReply.id, "Employee view correctly hides internal IT notes");

    // ----------------------------------------------------------------
    // Clean up test data
    // ----------------------------------------------------------------
    console.log("\nCleaning up test records...");
    await TicketReply.destroy({ where: { ticketId: [networkTicket.id, vpnTicket.id, securityTicket.id, otherTicket.id, emailTicket.id] } });
    await Ticket.destroy({ where: { id: [networkTicket.id, vpnTicket.id, securityTicket.id, otherTicket.id, emailTicket.id] } });
    await AgentCategory.destroy({ where: { agentId: [testAgent1.id, testAgent2.id, testAgent3.id, tempAgent.id, inactiveAgent.id] } });
    await User.destroy({ where: { id: [testAdmin.id, testEmployee.id, testAgent1.id, testAgent2.id, testAgent3.id, tempAgent.id, inactiveAgent.id] } });

    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("==================================================");

    process.exit(failedTests > 0 ? 1 : 0);
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  }
}

runTests();
