import { Sequelize, DataTypes, Model, Optional } from "sequelize";
import { Role } from "../_helpers/role";

export interface AccountAttributes {
  id: number;
  email: string;
  passwordHash: string;
  title: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  role: Role;
  verificationToken: string | null;
  verified: Date | null;
  resetToken: string | null;
  resetTokenExpires: Date | null;
  passwordReset: Date | null;
  created: Date | null;
  updated: Date | null;
  isVerified: boolean;
}

export interface AccountCreationAttributes
  extends Optional<
    AccountAttributes,
    | "id"
    | "verificationToken"
    | "verified"
    | "resetToken"
    | "resetTokenExpires"
    | "passwordReset"
    | "created"
    | "updated"
    | "isVerified"
  > {}

export class Account
  extends Model<AccountAttributes, AccountCreationAttributes>
  implements AccountAttributes
{
  public id!: number;
  public email!: string;
  public passwordHash!: string;
  public title!: string;
  public firstName!: string;
  public lastName!: string;
  public acceptTerms!: boolean;
  public role!: Role;
  public verificationToken!: string | null;
  public verified!: Date | null;
  public resetToken!: string | null;
  public resetTokenExpires!: Date | null;
  public passwordReset!: Date | null;
  public created!: Date | null;
  public updated!: Date | null;

  // Virtual fields
  public get isVerified(): boolean {
    return !!this.verified;
  }
}

export default function (sequelize: Sequelize): typeof Account {
  Account.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      acceptTerms: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: Role.User,
      },
      verificationToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      verified: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resetToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      resetTokenExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      passwordReset: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      updated: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      isVerified: {
        type: DataTypes.VIRTUAL,
        get() {
          return !!this.getDataValue("verified");
        },
        set() {
          throw new Error("Do not try to set the `isVerified` value!");
        },
      },
    },
    {
      sequelize,
      tableName: "accounts",
      defaultScope: {
        attributes: { exclude: ["passwordHash"] },
      },
      scopes: {
        withHash: {
          attributes: { include: ["passwordHash"] },
        },
      },
      timestamps: false,
    }
  );

  return Account;
}
