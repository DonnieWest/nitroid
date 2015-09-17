#!/usr/bin/env node

/*
 * Copyright 2015 Donn Felker, Zeb Deos, Donnie West
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *  http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var wrench = require('wrench'),
    util = require('util'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    async = require('async'),
    program = require('commander');

/*
 * Project generator route. 
 * This entire route is super brute force and rather naive. However, it works and is easy to follow. 
 * TODO: Possible improvements include doing more async calls with the fs module since this uses the async.js
 * lib it shouldn't be too bad to impelement. 
*/

program
    .version('0.0.1')
    .option('-p --package-name [value]', 'Package name of Project')
    .option('-n --application-name [value]', 'Name of package')
    .option('-i --input-directory <path>', 'Input Directory')
    .option('-o --output-directory <path>', 'Output Directory')
    .parse(process.argv);

convert = function() {

    // 1. Create a temporary file(s) location. 
    // 2. Rename the directories accordingly. 
    // 3. Loop over all the files and perform replacements. 
    // 4. Zip up the content & Send to the output stream
    // 5. Delete the temporary file(s). 
    // 6. All Done - Do some 12 ounce curls. 

    console.log(process.env.PWD);

    var appName = program.applicationName;
    var packageName = program.packageName;

    console.log("App Name:" + appName);
    console.log("Package Name:" + packageName);

    // Android Bootstrap source directory
    var sourceDir = program.inputDirectory;
    
    // Temporary locationwhere the users project will be generated.
    var destDir = process.env.PWD + '/tmp/' + packageName; 

    //Final Location where project is generated
    var finalDir = program.outputDirectory

    console.log("sourceDir: " + sourceDir);
    console.log("destDir: " + destDir); 
    console.log("sourceDir: " + finalDir);
    
    // Copy the files to temp directory. 
    wrench.copyDirSyncRecursive(sourceDir, destDir);

    var theFiles = wrench.readdirSyncRecursive(destDir);
    console.log(theFiles);

    var callItems = [];


    theFiles.forEach(function(currentFile) {
      var genFileFunc = generateFileFunc(destDir + "/" + currentFile, packageName, appName);
      callItems.push(genFileFunc);

    });

    async.parallel(callItems, function(err, results) {
      
      if(err) {
        console.error("**** ERROR ****");
      } else {
        
        // Now, all items have been executed, perform the copying/etc.
        createSourceDirectories(destDir, packageName);
        copySourceDirectories(destDir, packageName); 
        removeBootstrapDirectories(destDir); 
        wrench.copyDirSyncRecursive(destDir, finalDir);
      }
    }); 
}

function getFileObjectsFrom(destDir, files) {
  var fileObjs = []
  for(var i=0; i<files.length;i++) {
    var filePath = destDir + "/" + files[i];
    var stats = fs.lstatSync(filePath);
    if(!stats.isDirectory())
      fileObjs.push({ name: files[i], path: filePath });
  }
  return fileObjs;
}

function generateFileFunc(file, packageName, appName) {
  return function(callback) {
    generateFile(file, packageName, appName, callback);
  }
}

function removeBootstrapDirectories(destDir) {

  // TODO: remove the old bootstrap source, unit-test and integration-test folders that are not valid anymore.
  console.log("Removing temporary work directories.");
  
  // Clean up - delete all the files we were just working with. 
  var bootstrapSourceDir = destDir + "/app/src/main/java/com/donnfelker"; 
  var bootstrapUnitTestDir = destDir + "/app/src/test/java/com/donnfelker"; 
  var integrationTestDir = destDir +  "/integration-tests/src/main/java/com/donnfelker"; 

  console.log("Removing: " + bootstrapSourceDir);
  console.log("Removing: " + bootstrapUnitTestDir);
  console.log("Removing: " + integrationTestDir);
  
  wrench.rmdirSyncRecursive(bootstrapSourceDir, false);
  wrench.rmdirSyncRecursive(bootstrapUnitTestDir, false);
  wrench.rmdirSyncRecursive(integrationTestDir, false);

}

// Creates the various new folder structures needed for the users new project. 
function createSourceDirectories(destDir, packageName) {

  var newPathChunk = getNewFilePath(packageName);

  var newSourceDirectory = destDir + "/app/src/main/java/" + newPathChunk; 
  console.log("Creating new source directory at: " + newSourceDirectory);
  wrench.mkdirSyncRecursive(newSourceDirectory); 

  var newUnitTestDirectory = destDir + "/app/src/test/java/" + newPathChunk; 
  console.log("Creating new source directory at: " + newUnitTestDirectory);
  wrench.mkdirSyncRecursive(newUnitTestDirectory); 

  var newIntegrationTestDirectory = destDir + "/integration-tests/src/main/java/" + newPathChunk; 
  console.log("Creating new integration tests directory at: " + newIntegrationTestDirectory);
  wrench.mkdirSyncRecursive(newIntegrationTestDirectory);     
}

function copySourceDirectories(destDir, packageName) {

  console.log(destDir);
  console.log(packageName);
  
  var newPathChunk = getNewFilePath(packageName);

  var oldSourceDir = destDir  +  "/app/src/main/java/com/donnfelker/android/bootstrap";  
  var newSourceDir = destDir    +  "/app/src/main/java/" + newPathChunk; 
  console.log("Copying source from" + oldSourceDir + " to directory " + newSourceDir);
  wrench.copyDirSyncRecursive(oldSourceDir, newSourceDir); 

  var oldUnitTestDir = destDir + "/app/src/test/java/com/donnfelker/android/bootstrap";
  var newUnitTestDir = destDir + "/app/src/test/java/" + newPathChunk; 
  console.log("Copying source from" + oldUnitTestDir + " to directory " + newUnitTestDir);
  wrench.copyDirSyncRecursive(oldUnitTestDir, newUnitTestDir); 

  var oldIntegrationTestDir = destDir + "/integration-tests/src/main/java/com/donnfelker/android/bootstrap";
  var newIntegrationTestDir = destDir + "/integration-tests/src/main/java/" + newPathChunk; 
  console.log("Copying source from" + oldIntegrationTestDir + " to directory " + newIntegrationTestDir);
  wrench.copyDirSyncRecursive(oldIntegrationTestDir, newIntegrationTestDir);     
}

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function generateFile(file, packageName, appName, callback) {

  var stats = fs.lstatSync(file);
  if(!stats.isDirectory() && !file.endsWith(".png")) { 
    // Only work with text files, no directories or png files.  
    // Above == terrible code, but for android-bootstrap, it works. Pragmatic & KISS. FTW.
    
    // Must include the encoding otherwise the raw buffer will
    // be returned as the data.
    var data = fs.readFileSync(file, 'utf-8');
        
    //console.log("Current File: " + file);
  
    console.log("File: " + file);
    // Sure, we could chain these, but this is easier to read.
    data = replacePackageName(data, packageName);
    data = replaceAuthToken(data, packageName);
    data = replaceAppName(data, appName);
    data = replaceHyphenatedNames(data, packageName);
    data = replaceProguardValues(data, packageName);

    // Finally all done doing replacing, save this bad mother.
    fs.writeFileSync(file, data); 
  }

   // Call back to async lib. 
    callback(null, file);
}


// Turns a package name into a file path string. 
// Example: com.foo.bar.bang turns into com\foo\bar\bang
function getNewFilePath(newPackageName) {
  return newPackageName.split('.').join('/'); 
}

function getOldFilePath() {
  return "com.donnfelker.android.bootstrap".split('.').join('/'); 
}

// Takes the old boostrap file name and returns the new file name
// that is created via the transform from the new package name. 
function getBootstrappedFileName(bootstrapFileName, newPackageName) {
  return bootstrapFileName.replace( getOldFilePath(), getNewFilePath(newPackageName) );
}

function replacePackageName(fileContents, newPackageName) {
  var BOOTSTRAP_PACKAGE_NAME = "com.donnfelker.android.bootstrap"; // replace all needs a regex with the /g (global) modifier
  var packageNameRegExp = new RegExp(BOOTSTRAP_PACKAGE_NAME, 'g');
          
  // Replace package name
  return fileContents.replace(packageNameRegExp, newPackageName);
}

function replaceAuthToken(fileContents, newPackageName) {
  var BOOTSTRAP_TOKEN = "com.androidbootstrap";
  var tokenRegExp = new RegExp(BOOTSTRAP_TOKEN, 'g'); // global search

  return fileContents.replace( tokenRegExp, newPackageName );
}

function replaceAppName(fileContents, newAppName) {
  var APP_NAME = "Android Bootstrap";
  var nameRegExp = new RegExp(APP_NAME, 'g'); // global search

  return fileContents.replace(nameRegExp, newAppName);
}

function replaceHyphenatedNames(fileContents, newPackageName) {
  var newHyphenatedName = newPackageName.toLowerCase().split('.').join('-');
  var hyphenatedRegExp = new RegExp("android-bootstrap", 'g'); // global search

  return fileContents.replace(hyphenatedRegExp, newHyphenatedName);
}

function replaceProguardValues(fileContents, newPackageName) {
  var newValue = newPackageName + '.'; 
  var valueToFind = new RegExp("com.donnfelker.android.", 'g');

  return fileContents.replace(valueToFind, newValue);
}

convert();
