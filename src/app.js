import express from 'express';
import routers from './routers/index.js' ;
const app = express() ;


app.use(express.json()) ;
app.use(express.urlencoded({ extended: true })) ;
app.use('/v1', routers);



export default app ;