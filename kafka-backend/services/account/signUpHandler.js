const bcrypt = require('bcrypt');
const User = require('../../models/UserModel');

const handle_request = async (msg, callback) => {
  console.log("inside signup handler")
  const res = {};
  const userExists = await User.findOne({ email: msg.email });
  if (userExists) {
    res.status = 400;
    res.message = 'USER_ALREADY_EXISTS';
    callback(null, res);
  } else {
    const user = new User(msg);
    user.password = bcrypt.hashSync(msg.password, 10);
    try {
      await user.save();
      res.data = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        language: user.language,
        currency: user.currency,
        timezone: user.timezone,
        image: user.image,
        _id: user._id,
      };
      // res.data = JSON.stringify(data);
      res.status = 200;
      callback(null, res);
    } catch (e) {
      res.status = 400;
      // console.log('Kafka Backend : SignUp failed');
      callback(null, e);
    }
  }
};

exports.handle_request = handle_request;
