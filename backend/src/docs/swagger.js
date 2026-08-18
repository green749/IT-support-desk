export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ITDesk - Enterprise IT Support & Ticket Management API',
    version: '2.0.0',
    description: `
**ITDesk API** is a real-time enterprise IT help desk and ticketing backend powered by Node.js, Express, Sequelize (MySQL), MongoDB, and Socket.IO.

### Core Capabilities:
- 🔐 **Dual JWT Authentication** (HttpOnly access & refresh cookies with CSRF token verification).
- 🎫 **Full IT Ticket Lifecycle** (Open, Assigned, In Progress, Waiting for Customer, Resolved, Closed, Reopened).
- 💬 **Live Support Stream & Internal Notes** (Socket.IO real-time collaboration).
- 🤖 **Smart Category-Based Agent Routing** (Automated assignment & workload balance).
- 📊 **Real-time Enterprise Analytics & System Metrics**.
    `,
    contact: {
      name: 'IT Operations Support Team',
      email: 'it-support@company.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User login, registration, token refresh, and identity verification' },
    { name: 'Tickets', description: 'IT support ticket creation, routing, resolution, and discussion stream' },
    { name: 'Categories', description: 'IT support classification taxonomy (Hardware, Network, VPN, etc.)' },
    { name: 'Users', description: 'Employee, agent, and administrator directory and category specializations' },
    { name: 'Analytics', description: 'Enterprise operations metrics, SLA summaries, and workload analytics' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'HttpOnly cookie containing the JWT access token',
      },
      csrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'x-csrf-token',
        description: 'CSRF token required for state-changing requests (POST, PUT, PATCH, DELETE)',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 49 },
          name: { type: 'string', example: 'agent1' },
          email: { type: 'string', format: 'email', example: 'agent1@company.com' },
          role: { type: 'string', enum: ['customer', 'agent', 'admin'], example: 'agent' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TicketCategory: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 4 },
          key: { type: 'string', example: 'software' },
          name: { type: 'string', example: 'Software Issue' },
          description: { type: 'string', example: 'Operating system and application support' },
          isActive: { type: 'boolean', example: true },
        },
      },
      TicketReply: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 12 },
          ticketId: { type: 'integer', example: 30 },
          userId: { type: 'integer', example: 49 },
          message: { type: 'string', example: 'Investigating configuration issue on workstation.' },
          isInternal: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          author: { $ref: '#/components/schemas/User' },
        },
      },
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 30 },
          title: { type: 'string', example: 'VPN authentication failure on remote client' },
          description: { type: 'string', example: 'Unable to connect to gateway after password reset.' },
          status: {
            type: 'string',
            enum: ['open', 'assigned', 'in_progress', 'waiting_for_customer', 'resolved', 'closed', 'reopened'],
            example: 'assigned',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            example: 'high',
          },
          categoryId: { type: 'integer', example: 3 },
          customerId: { type: 'integer', example: 48 },
          assignedAgentId: { type: 'integer', nullable: true, example: 49 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          customer: { $ref: '#/components/schemas/User' },
          assignedAgent: { $ref: '#/components/schemas/User' },
          ticketCategory: { $ref: '#/components/schemas/TicketCategory' },
          replies: {
            type: 'array',
            items: { $ref: '#/components/schemas/TicketReply' },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid credentials or request parameter' },
        },
      },
    },
  },
  security: [
    {
      cookieAuth: [],
    },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new employee account',
        description: 'Creates a standard employee user account with default customer role.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Sarah Jenkins' },
                  email: { type: 'string', format: 'email', example: 'sarah.jenkins@company.com' },
                  password: { type: 'string', format: 'password', minLength: 8, example: 'SecurePassword123!' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error or email already in use',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in to ITDesk',
        description: 'Authenticates employee, agent, or administrator and issues secure HttpOnly access & refresh cookies.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'agent1@company.com' },
                  password: { type: 'string', format: 'password', example: 'Agent123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authenticated successfully with cookies set',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Log out and clear session',
        description: 'Clears access and refresh token cookies.',
        responses: {
          200: {
            description: 'Session terminated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Logged out successfully' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current authenticated user identity',
        description: 'Returns profile, role, and authorization details for the active session.',
        responses: {
          200: {
            description: 'Active session user data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized / expired session',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Uses the refresh cookie to issue a new access token without re-entering credentials.',
        responses: {
          200: {
            description: 'Access token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Token refreshed' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid or expired refresh token',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/tickets': {
      get: {
        tags: ['Tickets'],
        summary: 'List tickets',
        description: 'Returns tickets filtered by user authorization (customers see their own tickets, agents see assigned/category tickets, admins see all).',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by ticket status' },
          { name: 'priority', in: 'query', schema: { type: 'string' }, description: 'Filter by priority' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category name' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search term across title and description' },
        ],
        responses: {
          200: {
            description: 'Array of tickets',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Ticket' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tickets'],
        summary: 'Create a new IT support ticket',
        description: 'Submits a new ticket with automatic specialist agent routing based on selected category.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'priority'],
                properties: {
                  title: { type: 'string', example: 'Network outage on 4th floor switch' },
                  description: { type: 'string', example: 'All workstations in zone B lost Ethernet connectivity.' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'high' },
                  categoryId: { type: 'integer', example: 2 },
                  category: { type: 'string', example: 'Network Issue' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Ticket created and routed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Ticket' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/tickets/{id}': {
      get: {
        tags: ['Tickets'],
        summary: 'Get ticket details and discussion stream',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Detailed ticket object with replies',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Ticket' },
                  },
                },
              },
            },
          },
          404: { description: 'Ticket not found' },
        },
      },
      patch: {
        tags: ['Tickets'],
        summary: 'Update ticket status or priority',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['open', 'assigned', 'in_progress', 'waiting_for_customer', 'resolved', 'closed', 'reopened'],
                    example: 'resolved',
                  },
                  priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'critical'],
                    example: 'medium',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Ticket updated successfully and socket notification broadcasted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Ticket' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/tickets/{id}/replies': {
      post: {
        tags: ['Tickets'],
        summary: 'Post a reply or private internal note',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string', example: 'Diagnostic logs indicate DNS cache corruption.' },
                  isInternal: { type: 'boolean', example: true, description: 'If true, visible only to agents/admins' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Reply saved and emitted via Socket.IO',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/TicketReply' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/tickets/{id}/assign': {
      post: {
        tags: ['Tickets'],
        summary: 'Assign or reassign an IT Support Agent to a ticket',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  agentId: { type: 'integer', nullable: true, example: 49, description: 'Agent ID (or null to unassign)' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Ticket assigned successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Ticket' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/tickets/{id}/eligible-agents': {
      get: {
        tags: ['Tickets'],
        summary: 'Get list of qualified agents specialized for a ticket category',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Array of eligible agents with active workload counts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', example: 49 },
                          name: { type: 'string', example: 'agent1' },
                          email: { type: 'string', example: 'agent1@company.com' },
                          activeTicketsCount: { type: 'integer', example: 2 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List active IT support categories',
        responses: {
          200: {
            description: 'Array of categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TicketCategory' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List user directory (Admin only)',
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['customer', 'agent', 'admin'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Array of users with assigned support categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user details by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'User details with assigned categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user account & category assignments (Admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['customer', 'agent', 'admin'], example: 'agent' },
                  isActive: { type: 'boolean', example: true },
                  categoryIds: {
                    type: 'array',
                    items: { type: 'integer' },
                    example: [3, 4, 5],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/users/{id}/categories': {
      get: {
        tags: ['Users'],
        summary: 'Get authorized categories for an agent',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Agent assigned categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        userId: { type: 'integer', example: 49 },
                        role: { type: 'string', example: 'agent' },
                        categories: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/TicketCategory' },
                        },
                        categoryIds: {
                          type: 'array',
                          items: { type: 'integer' },
                          example: [4, 5],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Get enterprise dashboard metrics and SLA analytics (Admin only)',
        responses: {
          200: {
            description: 'Comprehensive operations metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totals: {
                          type: 'object',
                          properties: {
                            tickets: { type: 'integer', example: 35 },
                            open: { type: 'integer', example: 8 },
                            inProgress: { type: 'integer', example: 6 },
                            resolved: { type: 'integer', example: 21 },
                            unassigned: { type: 'integer', example: 2 },
                          },
                        },
                        byStatus: { type: 'array', items: { type: 'object' } },
                        byPriority: { type: 'array', items: { type: 'object' } },
                        byCategory: { type: 'array', items: { type: 'object' } },
                        workload: { type: 'array', items: { type: 'object' } },
                        unassignedTickets: { type: 'array', items: { type: 'object' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
