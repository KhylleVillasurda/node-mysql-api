import config from "../../config.json";
import mysql from "mysql2/promise";
import { Sequelize } from "sequelize";
import type { Account } from "../accounts/account.model";
import type { RefreshToken } from "../accounts/refresh-token.model";

export interface Database {
  Account: typeof Account;
  RefreshToken: typeof RefreshToken;
  sequelize: Sequelize;
}

export const db: Database = {} as Database;

export async function initialize(): Promise<void> {
  // Create database if it doesn't exist
  const { host, port, user, password, database } = config.database;
  const connection = await mysql.createConnection({ host, port, user, password });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
  await connection.end();

  // Connect to database with Sequelize
  const sequelize = new Sequelize(database, user, password, {
    dialect: "mysql",
    logging: false,
  });

  // Initialize models
  const { default: accountModel } = await import("../accounts/account.model");
  const { default: refreshTokenModel } = await import("../accounts/refresh-token.model");

  db.Account = accountModel(sequelize);
  db.RefreshToken = refreshTokenModel(sequelize);

  // Define relationships
  db.Account.hasMany(db.RefreshToken, { foreignKey: "accountId", onDelete: "CASCADE" });
  db.RefreshToken.belongsTo(db.Account, { foreignKey: "accountId" });

  // Sync models with database
  await sequelize.sync({ alter: true });

  db.sequelize = sequelize;
}
