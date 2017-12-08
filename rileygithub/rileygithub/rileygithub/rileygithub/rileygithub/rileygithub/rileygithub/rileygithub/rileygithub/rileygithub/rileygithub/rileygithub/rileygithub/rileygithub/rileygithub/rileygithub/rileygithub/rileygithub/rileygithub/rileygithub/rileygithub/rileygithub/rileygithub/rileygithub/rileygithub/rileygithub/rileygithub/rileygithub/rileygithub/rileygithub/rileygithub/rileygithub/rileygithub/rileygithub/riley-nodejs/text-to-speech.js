var TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1');
var fs = require('fs');

var text_to_speech = new TextToSpeechV1({
  username: '2c47a47a-32b7-49af-ade7-19544f3591f8',
  password: 'q6htUF4xYxvc'
});

var params = {
  text: "Welcome to Riley. Please choose What’s That? or Look Around.",
  voice: 'en-US_AllisonVoice', // Optional voice
  accept: 'audio/wav'
};

// Pipe the synthesized text to a file
text_to_speech.synthesize(params).pipe(fs.createWriteStream('welcome.wav'));

