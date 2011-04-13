// Include necessary modules
var http = require("http"),
	https = require("https"),
	url=require("url"),
	path=require("path"),
	fs=require("fs"),
	events=require("events"),
	querystring = require("querystring"),
	sys = require("sys");

	
	
	
	
	
//Database related stuff (MongoDB/Mongoose)
//-----------------------------------------------------------------------------------------------------------------------

var mongoose = require('mongoose');

//Gets the JSON list of all saved insta pictures from the database
//@param: callback is the function to be called once the data is retrieved from the db
var getFavoritesFromDb = function(callback) {
	var db = mongoose.connect('127.0.0.1', 'test', 25303, function(err) { if (!err) {console.log("DB Connected"); }});
	var itemModel = mongoose.model('Item');
	itemModel.find( {}, function (err, found) {
		if (!err) {
			var data = [];
			for (i = 0 ; i < found.length; i++)
			{
				var item = { profilePic: found[i].profilePic, pic: found[i].pic, caption: found[i].caption, from: found[i].from };
				data.push(item);
			}
			db.disconnect();
			callback(data);
			return;
		}
		console.log("Query failed");
		db.disconnect();
	});
};

//Saves an insta item in the database
//@param: item is the insta image with metadata to be saved
//@param: callback is the function to be called once the save is done
var saveItemInDb = function (item, callback) {
	var db = mongoose.connect('127.0.0.1', 'test' , 25303, function(err) { if (!err) { console.log("DB Connected"); }});
	var itemModel = mongoose.model('Item');
	var newItem = new itemModel();
	newItem.profilePic = item.profilePic;
	newItem.pic = item.pic;
	newItem.caption = item.caption;
	newItem.from = item.from;
	newItem.save(function(err) {
		if (!err)
		{
			console.log("item saved");
			db.disconnect();
			callback(true);
			return;
		}
		callback(false);
	});
};

//Initiates the database with the required schema
var initateDb = function () {
	var db = mongoose.connect('127.0.0.1', 'test', 25303, function (err) { if (!err) { console.log("DB Connected"); } });
	var Item = new mongoose.Schema({ 
		profilePic: String,
		pic: String,
		caption: String,
		from: String
	});
	mongoose.model('Item', Item);
};

initateDb();

//Server related stuff (Nodejs)
//-----------------------------------------------------------------------------------------------------------------------

//Event handler for all requests
var emitter = new events.EventEmitter();  

//Save an image with metadata
var setAsFavor = function(req, res){
	req.addListener("data", function(chunk) {
		req.content += chunk;
	});
 
	req.addListener("end", function() {
		var data = querystring.parse(req.content);
		res.writeHead(200);
		res.write(req.content);
		saveItemInDb(data, function(saved) { 
			if (saved) { console.log("Item saved successfully"); }
			else { console.log("Item not saved"); }
		});
		res.end();
	});
};

//Serve Popular Trends
function getInstaTrends() {
	console.log("entering getInstaTrends");  
	var options = {host: 'api.instagram.com', path: '/v1/media/popular?client_id=b898975d7d6741c48512532a5baab85a', method: 'GET', port:443 };
	var toInsta = https.get(options, function(res) {
		body = "";
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			body += chunk;
			try { 
				body = JSON.parse(body); 
				emitter.emit("instatrends", body);  
			}
			catch (e) { 
			}
		});
		
	});  
    toInsta.end();  
}

//Serve Favorites
function getFavorites() {
	console.log("entering getFavorites");  
	try
	{
		getFavoritesFromDb(function(theData) {
			console.log("Total Favorites:" + theData.length);
			emitter.emit("favorites", theData);
		});
	}
	catch (e) { 
		console.log("error occurred while receiving favorites"); 
	} 
}  

//Serve Static Files
function load_static_web_file(uri, response) {
	var filename = path.join(process.cwd(), uri);
    
	path.exists(filename, function(exists) {
		
		// File not found
        if (!exists) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("404");
            response.end();
            return;
        }
        
		
        fs.readFile(filename, "binary", function(err, file) {
			
			// Error reading file
            if (err) {
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write(err+"\n");
                response.end();
                return;
            }
            
			// Success. Return a 200 header and the file as binary data.
            response.writeHead(200);
            response.write(file, "binary");
			
			// End the response.
            response.end();
        });
    });
}

//Create Server
http.createServer(function (request, response) {
	// Parse the entire URI to get just the pathname
	var uri = url.parse(request.url).pathname, query;
		console.log(uri);
		if (uri == "/") uri = "/index.html"; 
		if (uri == "/setAsFavor") //If image is to be saved as favourite
		{
			request.setEncoding("utf8");
			request.content = '';
			setAsFavor(request, response);
		}	
		else if (uri == "/getInstaTrends"){ //if popular images are to be shown
				emitter.addListener("instatrends", function(theData) { 
					response.writeHead(200, { "Content-Type" : "text/plain" });  
					response.write(JSON.stringify(theData));  
					response.end();  
			
				});
			
			getInstaTrends();
		}
		else if (uri == "/getFavorites") { //if favorites are to be shown
			emitter.addListener("favorites", function(theData) {
				response.writeHead(200, { "Content-Type" : "text/plain" } );
				response.write(JSON.stringify(theData));
				response.end();
			});
			getFavorites();
		}
		else //if static file is retrieved
		{
			load_static_web_file(uri, response);  
		}
    
}).listen(18917);
