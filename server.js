var express = require('express');
var http = require('http');
var bodyParser = require("body-parser");
var app = express();
var multer  =   require('multer');
var path=require('path');
const fs = require('fs');
var https = require('https');
var exec = require('child_process').exec;

var portNumber = process.argv[3];;
var ipAddress = process.argv[2];;
if(portNumber =='' || ipAddress == '') {
	console.log('Please pass IP address and port number of server');
	return;
}

var sysTokenId='1234';
//Speech to text starts
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
const VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');

//Visial Recognition
const visual_recognition = new VisualRecognitionV3({
  api_key: 'ff558a5991fbafccf6a72a3f4adf6d9479a24061',
  version_date: VisualRecognitionV3.VERSION_DATE_2016_05_20
});

//Speech to Text
const speech_to_text = new SpeechToTextV1({
  username: '6ba06ed0-c18a-476a-9ed1-8947f63857d9',
  password: 'bMMPIZ1g3NI0'
});
const sttParams = {
  content_type: 'audio/wav'
};
// create the stream
const recognizeStream = speech_to_text.createRecognizeStream(sttParams);


//Speech to text ends

//Watson TTS credentials
var TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1');
var text_to_speech = new TextToSpeechV1({
   username: '2c47a47a-32b7-49af-ade7-19544f3591f8',
   password: 'q6htUF4xYxvc'
});

//Watson TTS ends

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

app.use("/audio", express.static(path.join(__dirname, 'audio')));
app.use("/baseaudio", express.static(path.join(__dirname, 'baseaudio')));



app.get('/', function (req,res) {
   //console.log(req);
    res.send('Working!');
})

function validateToken(reqToken){
	if(sysTokenId == reqToken) {
		return true;
	}
	else{
		return false;
	}

}


// List filename extensions and MIME names we need as a dictionary. 
var mimeNames = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.ogg': 'application/ogg', 
    '.ogv': 'video/ogg', 
    '.oga': 'audio/ogg',
    '.txt': 'text/plain',
    '.wav': 'audio/x-wav',
    '.webm': 'video/webm'
};

/**
 * This api returns watson content hub images  alternative desc in audio file
 *
 * Gets all watson content hub image desc (text format) and convert them into auido and store into  audio folder
 *
 * @res audio file name
 */
app.get('/watson-tts', function (req,res) {
	var tokenId = req.query.tokenId;
	if(!validateToken(tokenId)){
		res.send("Sorry, you don't have access to use Riley");
		return true;
	}
    var text =  getText(req);
    console.log(text + 'text');
    createTTS(text, function(fileName){

        var stat = fs.statSync(fileName);
    	if (!fs.existsSync(fileName)) {
	        return null;
        }
        console.log(fileName);

		//Returns file name
		res.send('_callback(\'' + fileName +'\')');
    });  
});


/**
 * Creates audio file using text (TTS)
 *
 * Using watson TTS api, it creates wav file.
 * Once wav file is created, it is converted to mp3 using FFMPEG
 *
 * @param text
 * @param callback
 */
function createTTS(text,callback){
	var params = {
	    text: text,
	    voice: 'en-US_AllisonVoice', // Optional voice
	    accept: 'audio/wav'
	};
	var file = getDateTime() + ".wav";
	var filePath = 'audio' + '/' + file;
	var fstream = fs.createWriteStream(filePath);
    text_to_speech.synthesize(params).pipe(fstream);
    fstream.on('finish', function() {
		//Call function that creates mp3 file
    	convertWavToMP3(filePath, function(fileMp3Path){
    	 	console.log(fileMp3Path + ' mp3');
    	 	return callback(fileMp3Path);
    	 });

     });
}

//wavfile name
wavFileName = 'file-' + Date.now() + '.wav';

var imageContent, capturedImage;

//Multer is used to upload the file sent from mobile app.
var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
   	  callback(null, './picture');
  },
  filename: function (req, file, callback) {
  		callback(null, file.originalname);
  }
});

var upload =multer({storage : storage}).single('file');

/**
 * Uploads the file to server folder
 *
 * Checks the token validation
 * Checks image file size, if it exceeds more than 2mb, audio saying  audio file size exceeds returned to app
 * Get image description using Watson VR API
 * The text is processed using watson TTS feature and audio file (wav) is created
 * wav is converted to mp3 using ffmpeg and file name is returned
 *
 * @res returns audio file
 */
app.post("/picUpload",  function(req,res){

	var myTokenId = req.query.tokenId;
	console.log(myTokenId + ' my token id');
	if(!validateToken(myTokenId)){
		var nomorethan2bsupported = 'baseaudio/invalidaccess.mp3';
		res.send(nomorethan2bsupported);
		return false;
	}
	else{
		//Makes sure file is successfully uploaded
		upload(req,res, function(err){
			if(err) {
				console.log(' Image file cannot be uploaded');
			}
			var imageFileName =  req.file.originalname;
			var imageFilePath =  req.file.path;
			var imageFileSize = req.file.size;
			//Gets image file size
			imageFileSize = getFilesizeInBytes(imageFileSize);
			console.log(imageFileSize);
			imageFileSize = Math.round(imageFileSize);
			console.log('rounded value' + imageFileSize);
			// Checks if file size is greater than 2mb or not, if yes, it sends audio having >=2mb file zise is not supported
			if(imageFileSize <= 2) {

				//Get image description
				getImageDescription(imageFileName, function(imageInformation){
					console.log("image desc " + imageInformation);
					if(imageInformation != '') {
						imageInformation = "Here is some information about the captured image: " + imageInformation;
					}
					//Process text and creates audio
					createTTS(imageInformation, function(fileName){
						console.log(fileName);
						res.send(fileName);
						//return callback(fileName);
					});

				});
			}
			else {
				var nomorethan2bsupported = 'baseaudio/nomorethan2bsupported.mp3';
				res.send(nomorethan2bsupported);
			}

		});
	}
});


/**
 * Get file size
 *
 * @param fileSizeInBytes
 * @returns {number}
 */
function getFilesizeInBytes(fileSizeInBytes) {
	var fileSizeInMB = fileSizeInBytes / 1000000;
	return fileSizeInMB
}

/**
 * Get watson content hub available images
 *
 * get image description and convert it to audio using TTS
 *
 * Returns audio file name
 */
app.get('/getBaseLineImageInfo',function(req, res){
	//res.send('_callback(\'audio/20170925233008.mp3\')');
	var tokenId = req.query.tokenId;
	if(!validateToken(tokenId)){
		res.send("Sorry, you don't have access to use Riley");
		return true;
	}
	var userSelection = req.query.userSelection;
	console.log('selection ' + userSelection);
	getWHCImageContent(userSelection,function(imageContent){
		 createAudioFromSelectedImageDesc(imageContent , function(audioUrl){
			     	 	if(audioUrl == ''  || audioUrl == null) {
			     	 		audioUrl = 'baseaudio/nomatch.mp3';
			     	 	}
			     	 	var obj = {};
						obj.audioUrl = audioUrl;
						console.log('audioUrl' , audioUrl);
			     	 	//res.send(JSON.stringify(obj));
			     	 	res.send('_callback(\'' + audioUrl +'\')');
			     	   
		}); 
	});

})

/**
 * Get watson content hub images
 * @param selection
 * @param callback
 */
function getWHCImageContent(selection, callback){


    var url = 'https://my15.digitalexperience.ibm.com/api/42228a3a-1b9f-4834-8269-21ef39259228/delivery/v1/search?q=*:*&fl=*&fq=classification:asset&fq=assetType:image&sort=lastModified%20desc&rows=500';

	https.get(url, function(res){
	    var body = '';

	    res.on('data', function(chunk){
	        body += chunk;
	    });

	    res.on('end', function(){
	        var whcContent = JSON.parse(body);
	        
	        var documents = whcContent['documents'];
	       	var docLen = whcContent['documents'].length;
	         for (var i = 0, len = docLen; i < len; ++i) {
		        var assetWc = documents[i];
		        var jsonDoc = JSON.parse(assetWc.document);
		    
		        var alttext = jsonDoc.altText;
		        var description = jsonDoc.description;
		        console.log( "**" + selection + '***' + alttext + '***');
		        if(alttext == selection) {
		        	description = addAdditionalInfoToImageDesc(description , selection)  ;
		        	return callback(description);
		        }
	        } 
	    });
	}).on('error', function(e){
	      console.log("Got an error: ", e);
	});

}


/**
 * Converts wav file to mp3 using ffmpeg
 *
 * @param wavFile
 * @param cb
 */


function convertWavToMP3(wavFile, cb){
	var fileName = wavFile.replace('.wav' ,'.mp3');
	console.log("ffmpeg -i " + wavFile + " " + fileName);
	exec("ffmpeg -i " + wavFile + " " + fileName, function (error, stdout, stderr) { 
			return cb(fileName);
	 });
	/* we need to remove wav file once mp3 is created but we need more work here.*/
}



function puts(error, stdout, stderr) { console.log(stdout) }

/**
 * Get Image description using Watson VR
 *
 * @param fileName
 * @param callback
 */
function getImageDescription(fileName,callback) {
	var filePath = 'picture/' + fileName;
	console.log(filePath);
    const params = {
  // must be a .zip file containing images
  		images_file: fs.createReadStream(filePath)
	};

	visual_recognition.classify(params, function(err, res) {
		var i,j, imageInfo = '';
	   if (err) {
	        console.log(err + ' Error');
	   } else {
	   	    console.log('File');
	  	    var imgClasses = JSON.stringify(res, null, 2);
	  	    console.log(imgClasses);
	        var jsonObj = JSON.parse(imgClasses);
	     
	 		 for (i = 0; i < jsonObj.images[0]['classifiers'].length; i++)
			{
			    var imgClasses  = jsonObj.images[0]['classifiers'][i]['classes'];
			    //console.log(imgClasses.length);

			    for(j=0 ; j < imgClasses.length; j++) {
				 	if(j == (imgClasses.length-1)) {
				 		imageInfo += imgClasses[j]['class'] 
				 	}
				 	else {
				 		imageInfo += imgClasses[j]['class'] + ', ';
				 	}
			     } 
			} 
	}
	return callback(imageInfo);
	});
}

/**
 * Creates audio with the image content/description
 *
 * @param whcContent
 * @param callback
 */
function createAudioFromSelectedImageDesc(whcContent , callback)
{
	 
	console.log('selected image desc', whcContent);
	if(whcContent != '' ) {
		createTTS(whcContent, function(fileName){
			return callback(fileName);
	    });  
	}
   
}

/**
 * Adds aditional description to the provided image desc
 *
 * @param description
 * @param imageDesc
 * @returns {string}
 */

function addAdditionalInfoToImageDesc(description, imageDesc)
{
	imageDesc = imageDesc.replace('view' ,'');
	imageDesc = imageDesc + ' view' ;
	var info = 'Riley is describing the selected option, ' + imageDesc   + 
	           description + 
	           ' Thank you';
	return info;
}


/**
 * Gets text  information from audio file
 *
 * Its not used in current solution but has future use.
 *
 * @param wavFile
 * @param cb
 */
function getTextFromWav(wavFile,cb)
{ 
	const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
	const fs1 = require('fs');

	const speech_to_text1 = new SpeechToTextV1({
	  username: '6ba06ed0-c18a-476a-9ed1-8947f63857d9',
	  password: 'bMMPIZ1g3NI0'
	});

	const params2 = {
	  content_type: 'audio/wav'
	};

	// create the stream
	const recognizeStream1 = speech_to_text1.createRecognizeStream(params2);

	// pipe in some audio
	fs.createReadStream(__dirname + '/uploads/' + wavFile).pipe(recognizeStream1);
	console.log(__dirname + '/uploads/' + wavFile);
	// and pipe out the transcription
	recognizeStream1.pipe(fs1.createWriteStream('transcription.txt'));

	// listen for 'data' events for just the final text
	// listen for 'results' events to get the raw JSON with interim results, timings, etc.

	recognizeStream1.setEncoding('utf8'); // to get strings instead of Buffers from `data` events

	['data'].forEach(function(eventName) {
		console.log('hello' + eventName);
	  //recognizeStream1.on(eventName, console.log.bind(console, eventName + ' event: '));
	  recognizeStream1.on('data', function(event) { 
		  var tt = JSON.stringify(event);
		  console.log(tt + '  <-User selected audio');
		  //return cb(tt);
		  return cb(tt);
	    }
	 );
	});
	console.log('text extraction');

	 //return cb('right view');
}


/**
 * Algorith to decrypt string
 *
 * Encryption and decryption uses same algorithm, encryption is used in mobile app
 * @param str
 * @returns {string}
 */
function decrypt(str) {
    if (!str) str = "";
    str = (str == "undefined" || str == "null") ? "" : str;
    try {
        var key = 146;
        var pos = 0;
        ostr = '';
        while (pos < str.length) {
            ostr = ostr + String.fromCharCode(key ^ str.charCodeAt(pos));
            pos += 1;
        }

        return ostr;
    } catch (ex) {
        return '';
    }
}

/**
 * Get text from request sent
 *
 * @param req
 * @returns {string}
 */
function getText(req)
{
	var text =req.query.text;
	//text = encrypt(text);
	console.log('text ' + text);
	return decrypt(text);
}

/**
 * create a string of datetime (timestamp)
 *
 * @returns {string}
 */
function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "" + month + "" + day + "" + hour + "" + min + "" + sec;

}


app.listen(portNumber, ipAddress);
//app.listen(3000,'169.47.245.211');
console.log(ipAddress + " ,API is running on port 3000");
