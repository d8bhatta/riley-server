#!/usr/local/bin/node
var express = require('express');
var http = require('http');

var path=require('path');
const fs = require('fs');
var rimraf = require('rimraf');

var uploadsDir = __dirname + '/picture';
console.log(uploadsDir);
deleteOlderFiles(uploadsDir);

//Deletes audio older files
var audioDir = __dirname + '/audio';
console.log(audioDir);
deleteOlderFiles(audioDir);

function deleteOlderFiles(folderPath){
    fs.readdir(folderPath, function(err, files) {
        files.forEach(function(file, index) {
            console.log(file);
            fs.stat(path.join(folderPath, file), function(err, stat) {
                var endTime, now;
                if (err) {
                    return console.error(err);
                }
                now = new Date().getTime();
                endTime = new Date(stat.ctime).getTime() + 3600000;
                if (now > endTime) {
                    return rimraf(path.join(folderPath, file), function(err) {
                        if (err) {
                            return console.error(err);
                        }
                        console.log('successfully deleted');
                    });
                }
            });
        });
    });
}