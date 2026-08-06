const logger ={
    info:async(message)=>{
       let time = new Date().toLocaleString() ;
       console.log(`[${time}]+"INFO"+ ${message}`);
    }
}
export default logger;