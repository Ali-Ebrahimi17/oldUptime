const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose')

const MachineUserSchema = new Schema(
  {
    firstName            : {
      type      : String,
      required  : [ true, 'Please enter your name' ],
      trim      : true,
      lowercase : true,
      maxLength : [ 50, 'Your name cannot exceed 50 characters' ],
    },
    lastName             : {
      type      : String,
      required  : [ true, 'Please enter your name' ],
      trim      : true,
      lowercase : true,
      maxLength : [ 50, 'Your name cannot exceed 50 characters' ],
    },
    clockNumber          : {
      type      : String,
      required  : [ true, 'Please enter clock number' ],
      trim      : true,
      unique    : true,
      mainength : [ 6, 'Your clock number must be 6 characters' ],
      maxLength : [ 6, 'Your clock number must be 6 characters' ],
    },
    division             : {
      type     : String,
      required : [ true, 'Please enter a division' ],
      enum     : {
        values  : [
          'LDL',
          'BHL',
          'CABS',
          'CP',
          'EM',
          'HP',
          'Group Operations',
        ],
        message : 'Please select a valid division',
      },
    },
    role                 : {
      type     : String,
      required : [ true, 'Please enter a role' ],
      enum     : {
        values  : [
          'Team Leader',
          'Responder',
          'Maintenance',
          'Setter',
          'Group Leader',
          'Manager',
          'Ops Manager',
          'General Manager',
          'Director',
        ],
        message : 'Please select a valid role',
      },
    },
    email                : {
      type      : String,
      required  : [ true, 'Please enter your email' ],
      trim      : true,
      lowercase : true,
      unique    : true,
    },
    password             : {
      type : String,
      // trim   : true,
      // required  : [ true, 'Please enter your password' ],
      // minLength : [ 6, 'Your password must at least 6 characters' ],
      // select : false,
    },
    mobile               : {
      type : String,
      trim : true,
      // minLength : [ 11, 'Mobile number must be 11 digits long' ],
    },
    createdBy            : {
      type     : Schema.Types.ObjectId,
      required : true,
    },
    updatedBy            : {
      type : Schema.Types.ObjectId,
    },
    active               : { type: Boolean, default: true },
    resetPasswordToken   : String,
    resetPasswordExpires : Date,
  },
  { timestamps: true },
)

MachineUserSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('MachineUser', MachineUserSchema)
