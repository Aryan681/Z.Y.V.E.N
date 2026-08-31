
import  QRCode from "qrcode";
const qrCodeGenerator = {
    generateQrCode :async function (url){
        const qrCode = await QRCode.toDataURL(url);
        return qrCode;
    },
}
export default qrCodeGenerator;