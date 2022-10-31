import type {TypeExpressionOperator, Types} from 'mongoose';
import {Schema, model} from 'mongoose';

/**
 * This file defines the properties stored in a User
 * DO NOT implement operations here ---> use collection file
 */

// Type definition for User on the backend
export type User = {
  _id: Types.ObjectId; // MongoDB assigns each object this ID on creation
  username: string;
  password: string;
  dateJoined: Date;
  follows: Array<Types.ObjectId>;
  followers: Array<Types.ObjectId>;
  votes: Map<Types.ObjectId, string>;
  reports: Map<Types.ObjectId, string>;
  verified: boolean
};

// Mongoose schema definition for interfacing with a MongoDB table
// Users stored in this table will have these fields, with the
// type given by the type property, inside MongoDB
const UserSchema = new Schema({
  // The user's username
  username: {
    type: String,
    required: true
  },
  // The user's password
  password: {
    type: String,
    required: true
  },
  // The date the user joined
  dateJoined: {
    type: Date,
    required: true
  },
  // All users that the user is following
  follows: [{
    type: String,
    required: false
  }],
  // All users that follow the user
  followers: [{
    type: String,
    required: false
  }],
  // All freet votes that the user has made
  votes: [{
    freetId: {
      type: String,
      required: false
    },
    voteType: {
      type: String,
      required: false
    }
  }],
  // All freet reports that the user has made
  reports: [{
    freetId: {
      type: String,
      required: false
    },
    reportType: {
      type: String,
      required: false
    }
  }],
  verified: {
    type: Boolean,
    required: true
  }
});

const UserModel = model<User>('User', UserSchema);
export default UserModel;
