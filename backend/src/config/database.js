import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const isCloudDb =
  process.env.MYSQL_HOST &&
  !["localhost", "127.0.0.1"].includes(process.env.MYSQL_HOST);

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    dialect: "mysql",
    logging: false,
    dialectOptions: isCloudDb
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export async function connectDatabase() {
  await sequelize.authenticate();
  console.log("MySQL connected");
}

export default sequelize;
