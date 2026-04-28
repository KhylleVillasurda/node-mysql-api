import { Sequelize, DataTypes, Model, Optional } from "sequelize";

export interface RefreshTokenAttributes {
  id: number;
  accountId: number;
  token: string;
  expires: Date;
  created: Date;
  createdByIp: string;
  revoked: Date | null;
  revokedByIp: string | null;
  replacedByToken: string | null;
  isExpired: boolean;
  isActive: boolean;
}

export interface RefreshTokenCreationAttributes
  extends Optional<
    RefreshTokenAttributes,
    | "id"
    | "revoked"
    | "revokedByIp"
    | "replacedByToken"
    | "isExpired"
    | "isActive"
  > {}

export class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  public id!: number;
  public accountId!: number;
  public token!: string;
  public expires!: Date;
  public created!: Date;
  public createdByIp!: string;
  public revoked!: Date | null;
  public revokedByIp!: string | null;
  public replacedByToken!: string | null;

  // Virtual fields
  public get isExpired(): boolean {
    return new Date() > this.expires;
  }

  public get isActive(): boolean {
    return this.revoked === null && !this.isExpired;
  }
}

export default function (sequelize: Sequelize): typeof RefreshToken {
  RefreshToken.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      accountId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "accounts",
          key: "id",
        },
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expires: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      created: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      createdByIp: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      revoked: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      revokedByIp: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      replacedByToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isExpired: {
        type: DataTypes.VIRTUAL,
        get() {
          return new Date() > this.getDataValue("expires");
        },
        set() {
          throw new Error("Do not try to set the `isExpired` value!");
        },
      },
      isActive: {
        type: DataTypes.VIRTUAL,
        get() {
          return (
            this.getDataValue("revoked") === null &&
            new Date() <= this.getDataValue("expires")
          );
        },
        set() {
          throw new Error("Do not try to set the `isActive` value!");
        },
      },
    },
    {
      sequelize,
      tableName: "refreshTokens",
      timestamps: false,
    }
  );

  return RefreshToken;
}
