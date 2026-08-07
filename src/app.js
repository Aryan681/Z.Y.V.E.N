import express from 'express';
import routers from './routers/index.js' ;
import requestLogger from './middlewares/logger.middleware.js';
const app = express() ;


app.use(express.json()) ;
app.use(express.urlencoded({ extended: true })) ;
app.use(requestLogger);
app.use('/v1', routers);



export default app ;