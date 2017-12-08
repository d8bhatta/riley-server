var express = require('express');
var http = require('http');
var bodyParser = require("body-parser");
var app = express();
var multer  =   require('multer');
var path=require('path');
const fs = require('fs');
var exec = require('child_process').exec;

//Speech to text starts
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
const VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');

//Visial Recognition
const visual_recognition = new VisualRecognitionV3({
  api_key: 'c378051265ad47a26484768c4a5593faac1697d6',
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

app.get('/watson-tts', function (req,res) {
    var text =  getText(req);
    console.log(text + 'text');
    createTTS(text, function(fileName){
    	//fileName = 'audio/file-1503987646987.wav';
    	 
        var stat = fs.statSync(fileName);
    	if (!fs.existsSync(fileName)) {
	        //sendResponse(res, 404, null, null);
	        return null;
        }
        console.log(fileName);
        //fileName = 'audio/ganapati.mp3';
        
		res.send('_callback(\'' + fileName +'\')');
    });  
});


function getMimeNameFromExt(ext) {
    var result = mimeNames[ext.toLowerCase()];
    
    // It's better to give a default value.
    if (result == null)
        result = 'application/octet-stream';
    
    return result;
}

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
    	convertWavToMP3(filePath, function(fileMp3Path){
    	 	console.log(fileMp3Path + ' mp3');
    	 	return callback(fileMp3Path);
    	 });
           
     });
}

//Mobile uploads starts
wavFileName = 'file-' + Date.now() + '.wav';
picname=Date.now() + '.jpeg';
var imageContent, capturedImage;

var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
    callback(null, './picture');
    imageContent = req.body.watsonText;
    capturedImage = req.body.fileName;

  },
  filename: function (req, file, callback) {
  	imageContent = req.body.watsonText;
  	var rileyFileName = req.body.rileyFileName;
  	
  	if(rileyFileName !=  undefined ) {
  		wavFileName = rileyFileName;
  	}
  	//console.log('wav Audio File name' + wavFileName);
  	if(imageContent == undefined || !imageContent) {
  		wavFileName = wavFileName.replace('.wav','.jpeg');
  	}
    callback(null, wavFileName);
  }
});

 var upload = multer({ storage : storage}).single('file');
 var uploadpic = multer({ storage : storage}).single('file');

app.post('/audioUpload',function(req,res){
    upload(req,res,function(err) {
	    if(err) {
	      console.log(err)
	      return res.end("Error uploading file.");
	    }

	    if(wavFileName != '') {
		     getTextFromWav(wavFileName, function(imageDesc){
		     	imageDesc = imageDesc.replace(/\"/g, "").trim();

		     	 createAudioFromSelectedImageDesc(imageContent , imageDesc, function(audioUrl){
		     	 console.log('audio url ' + audioUrl);
		     	 	if(audioUrl == ''  || audioUrl == null) {
		     	 		audioUrl = 'baseaudio/nomatch.mp3';
		     	 	}
		     	
		     		return res.end(audioUrl);
		     	});
		     	

			    
		    });
	    }
	});
});


app.post('/picUpload',function(req,res){
    uploadpic(req,res,function(err) {
	    if(err) {
	      console.log(err)
	      return res.end("Error uploading file.");
	    }
	    //Process image to VR
	    getImageDescription(wavFileName, function(imageInformation){
	    	console.log("image desc " + imageInformation);
	    	if(imageInformation != '') {
	    		imageInformation = "Riley has collected some information about the captured image and here it goes: " + imageInformation;
	    	}
	    	createTTS(imageInformation, function(fileName){
	    		console.log(fileName);
	    		res.send(fileName);
				//return callback(fileName);
		    }); 
	    	
	    })
	    
	});
  

});
function createCollection(colName) {
	
    

		var params = {
	  images_file: fs.createReadStream('./picture/images1.jpeg')
	};

	visual_recognition.classify(params, function(err, res) {
	  if (err)
	    console.log(err);
	  else
	    console.log(JSON.stringify(res, null, 2));
	});
}

function convertWavToMP3(wavFile, cb){
	var fileName = wavFile.replace('.wav' ,'.mp3');
	console.log("ffmpeg -i " + wavFile + " " + fileName);
	exec("ffmpeg -i " + wavFile + " " + fileName, function (error, stdout, stderr) { 
			return cb(fileName);
	 });
	//fs.unlinkSync(wavFile);
	//return cb(fileName);
}



function puts(error, stdout, stderr) { console.log(stdout) }

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

function getClassifierDetails(classifier_id)
{
	console.log("Classifier ");
	console.log(classifier_id);
		visual_recognition.getClassifier({
	  classifier_id: classifier_id },
	  function(err, response) {
	   if (err)
	    console.log(err);
	   else
	    console.log(JSON.stringify(response, null, 2));
	  }
	);
}



function createAudioFromSelectedImageDesc(imageContent ,imageDesc , callback)
{
	var imgObj = JSON.parse(imageContent);
	var description = '';
	var matchFound = false;
	for (const key of Object.keys(imgObj)) {

		var imgdesc1 = imgObj[key]['alternative_desc'].toLowerCase().trim();
		imageDesc = imageDesc.trim();
		console.log(imgdesc1 + '****' + imageDesc + '***');
		if(imgdesc1 == imageDesc ) {
			matchFound = true;
			console.log(imgdesc1 + '****' + imageDesc);
			description = imgObj[key]['description'];
			description = addAdditionalInfoToImageDesc(description, imageDesc);
			console.log(description);
			createTTS(description, function(fileName){
				return callback(fileName);
		    });  
		}
    }
    //return callback('');
    //return callback('');

}


function addAdditionalInfoToImageDesc(description, imageDesc)
{
	var info = 'You have selected ' + 
	           imageDesc + 
	           ' option. Now, Riley is describing about the selected option. ' + 
	           description + 
	           '. Thank you';
	return info;
}





//Mobile upload ends
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


function getText(req)
{
	var text =req.query.text;
	//text = encrypt(text);
	console.log('text ' + text);
	return decrypt(text);
}

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



app.listen(3000,'192.168.0.100');
console.log("API is running on port 3000");
