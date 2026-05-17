import mysql from "mysql2/promise";
import { Sequelize } from "sequelize";
import { config } from "./config";
import type { Account } from "../accounts/account.model";
import type { RefreshToken } from "../accounts/refresh-token.model";

export interface Database {
  Account: typeof Account;
  RefreshToken: typeof RefreshToken;
  sequelize: Sequelize;
}

export const db: Database = {} as Database;

export async function initialize(): Promise<void> {
  const { host, port, user, password, name, managedExternally } =
    config.database;

  // Only attempt to CREATE DATABASE when running locally with a root-capable user.
  // Railway (and most managed hosts) already provision the database and the
  // injected user does NOT have CREATE DATABASE privilege — skipping prevents
  // an "Access denied" error on startup.
  if (!managedExternally) {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${name}\`;`);
    await connection.end();
  }

  const sequelize = new Sequelize(name, user, password, {
    host,
    port,
    dialect: "mysql",
    logging: config.isProduction ? false : console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 10000, // fail after 10s instead of hanging forever
      idle: 10000,
    },
  });

  const { default: accountModel } = await import("../accounts/account.model");
  const { default: refreshTokenModel } =
    await import("../accounts/refresh-token.model");

  db.Account = accountModel(sequelize);
  db.RefreshToken = refreshTokenModel(sequelize);

  db.Account.hasMany(db.RefreshToken, {
    foreignKey: "accountId",
    onDelete: "CASCADE",
  });
  db.RefreshToken.belongsTo(db.Account, { foreignKey: "accountId" });

  await sequelize.sync({ alter: true });

  db.sequelize = sequelize;
}
