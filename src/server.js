import "./config/env.js";
import app from "./app.js" ;
import "./config/db.js" ;
import redisClient from './config/redis.js';
import Profile from "./models/user/user.js";
import Session from "./models/user/session.model.js";
import RiskEvent from "./models/risk/riskEvent.model.js";
import RiskNotification from "./models/risk/riskNotification.model.js";
import Device from "./models/user/device.model.js";
const startServer = async () => {
  await Profile();
  await Session();
  await RiskEvent();
  await RiskNotification();
  await Device();

  const PORT = process.env.PORT || 8080 ;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`) ;
  });
};

startServer();
