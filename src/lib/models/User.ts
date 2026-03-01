import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: String,
    image: String,
    emailVerified: Date,
  },
  { timestamps: true }
);

export const UserModel = models.User ?? model<IUser>("User", UserSchema);
