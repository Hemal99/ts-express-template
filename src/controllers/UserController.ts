import { Request, Response, NextFunction } from "express";

import { User } from "../models";

import {
  GeneratePassword,
  GenerateSalt,
  GenerateSignature,
  ValidatePassword,
} from "../utility";

import { sendMail } from "../services/MailService";

const mongoose = require("mongoose");

export const sendEmailFunc = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, classId } = req.body;
    await sendMail(email, classId);
    return res.status(200).json({ message: "Email Sent" });
  } catch (err) {
    return res.sendStatus(500);
  }
};

export const UserSignUp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = await mongoose.startSession();

  try {
    const { firstName, lastName, email, password, phone, role } = req.body;

    session.startTransaction();

    const salt = await GenerateSalt();
    const userPassword = await GeneratePassword(password, salt);

    const existingUser = await User.findOne({ email: email }).session(session);

    if (existingUser !== null) {
      return res.status(400).json({ message: "User already exist!" });
    }

    const user = new User({
      email: email,
      password: userPassword,
      role: role,
      salt: salt,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
    });

    const result = await user.save({ session });

    //Generate the Signature
    const signature = await GenerateSignature({
      _id: result._id,
      phone: result.phone,
      role: result.role,
    });
    // Send the result
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      signature,

      email: result.email,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
};

export const UserLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    const validation = await ValidatePassword(
      password,
      user.password,
      user.salt
    );

    if (validation) {
      const signature = await GenerateSignature({
        _id: user._id,
        firstName: user.firstName,
        email: user.email,
      });

      return res.status(200).json({
        signature,
        id: user._id,
        firstName: user.firstName,
      });
    }
  }

  return res.json({ msg: "Message" });
};

export const GetCustomerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const customer = req.user;

  if (customer) {
    const profile = await User.findById(customer._id);

    if (profile) {
      return res.status(201).json(profile);
    }
  }
  return res.status(400).json({ msg: "Error while Fetching Profile" });
};

export const EditCustomerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const customer = req.user;

  const { firstName, lastName, address } = req.body;

  if (customer) {
    const profile = await User.findById(customer._id);

    if (profile) {
      profile.firstName = firstName;
      profile.lastName = lastName;
      profile.address = address;
      const result = await profile.save();

      return res.status(201).json(result);
    }
  }
  return res.status(400).json({ msg: "Error while Updating Profile" });
};

export const UserForgetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, classId, newPassword } = req.body;

    const user = await User.findOne({ email, classId });

    const salt = await GenerateSalt();
    const userPassword = await GeneratePassword(newPassword, salt);

    if (user) {
      user.password = userPassword;
      user.salt = salt;

      await user.save();

      return res.status(200).json({ msg: "Password Changed Successfully" });
    }

    return res.status(400).json({ msg: "Error while Changing Password" });
  } catch (err) {
    return res.status(500).json({ msg: "Error while Fetching Pdf" });
  }
};
