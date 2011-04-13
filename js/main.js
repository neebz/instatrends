var currentStream = GetPopular;
var timeout;
var streamPanel;

Ext.setup({
	tabletStartupScreen: 'tablet_startup.png',
	phoneStartupScreen: 'phone_startup.png',
	
	glossOnIcon: false,
	onReady: function () {
	
		//Title Bar
		//-------------
		var titleBar = new Ext.Panel ( {
			cls: "titleBarcss",
			dock:"top",
			layout: { type: "hbox", alight:"right", pack:"right" },
			items: [ { html: "InstaTrends (updates every 30 seconds)" } ]
		
		});
		
		//Left Bar Menu
		//-------------
		Ext.regModel('ListItem', {
			fields: ['listText', 'listValue']
		});
		var store = new Ext.data.JsonStore({
			model  : 'ListItem',
			sorters: 'seq',
			data: [
				{listText: 'Popular',   listValue: 'p', seq: 1},
				{listText: 'Favorites',     listValue: 'f', seq: 2},
				{listText: 'Nearby',   listValue: 'n', seq: 3}
			]
		});
		var list = new Ext.List({
			dock: "left",
			layout: { type:"vbox", align:"left"},
			singleselect: true,
			allowDeselect: false,
			itemTpl : '{listText}',
			grouped : false,
			indexBar: false,
			showAnimation:true,
			store: store
		});
		var selectionchange = function(a, b) { 
			if (b.length > 0)
			{
				if (b[0].data.listValue == 'p') {
					currentStream=GetPopular;
					$("#subTextPanel").html("Popular Trends Worldwide");
				}
				else if (b[0].data.listValue == 'f') {
					currentStream = GetFavorites;
					$("#subTextPanel").html("Favorites selected by everyone using this app");
				}
				else if (b[0].data.listValue == 'n'){
					currentStream = '';
					$("#subTextPanel").html("Working on it");
				}
				clearTimeout(timeout);
				$("#streamPanel").html("");
				try { 
					currentStream();
				} catch (e) { }
			}
		};
		list.on("selectionchange", selectionchange);
		list.show();
		
		//Stream Panel
		//-------------
			
			streamPanel = new Ext.Panel({ 
			cls: 'streamPanelcss',
			scroll: 'vertical',
			layout: { type:'fit', align:'left' },
			contentEl: 'streamPanel'		
		});
		
		//SubTitle
		//--------
		
		var subTitle = new Ext.Panel({
			cls: 'subTitlecss',
			dock: 'top',
			contentEl:'subTextPanel'
		});
		
			
		//Main Panel
		//----------
		var mainPanel = new Ext.Panel({ 
			fullscreen:true,
			cls:"mainPanelcss",
			dockedItems: [titleBar, list, subTitle],
			layout: "fit",
			items: [streamPanel]
		});
		
		
		
	}
});

//Gets the popular images from the server
var GetPopular = function () {
	$.getJSON('/getInstaTrends', function(res, textStatus, jqXHR){
		console.log(res);
		var theData = [];
		for (i = 0; i < res.data.length; i++)
		{
			var thecap = "";
			if (res.data[i].caption != null)
			{
				thecap = res.data[i].caption.text;
			}
			theData.push({
				from : res.data[i].user.full_name,
				profilePic : res.data[i].user.profile_picture,
				caption : thecap,
				pic : res.data[i].images.standard_resolution.url
			});
		}
		showData(theData, false);
		timeout = setTimeout(currentStream, 30000);
	}); 
};

//Gets the favorites from the server
var GetFavorites = function () {
	$.getJSON('/getFavorites', function(res, textStatus, jqXHR) {
		console.log(res);
		showData(res, true);
		streamPanel.scroller.scrollTo({x:0,y:0},true);
	});
};

//shows the data in the timeline
//@param: data is the array of json objects, each represting an instagram picture with metadata
var showData = function(data, fav) {
	var html = "";
	for (i = 0; i < data.length; i++)
	{
		html += '<div class="boundary" style="display: none;">';
		html += 	'<div class="instaItem">';
		html += 		'<div class="details">';
		html += 			'<div><img src="'+ data[i].profilePic +'" alt=""></img></div>';
		html +=				'<div>'+ data[i].from +'</div>';
		if (!fav) {
			html +=				'<form action="/setAsFavor" method="post" class="favorForm">';
			html +=					'<input type="hidden" value="'+ data[i].profilePic +'" name="profilePic" id="profilePic">';
			html +=					'<input type="hidden" value="'+ data[i].from +'" name="from" id="from">';
			html +=					'<input type="hidden" value="'+ data[i].pic +'" name="pic" id="pic">';
			html +=					'<input type="hidden" value="'+ data[i].caption +'" name="caption" id="caption">';
			html +=					'<button type="submit">Favor Image</button>';
			html +=				'</form>';
		}
		html +=			'</div>';
		html +=			'<div class="image">';
		html +=				'<div><img src="'+ data[i].pic +'" alt=""></img></div>';
		html +=				'<div class="caption">'+ data[i].caption +'</div>';
		html +=			'</div>';
		html +=		'</div>';
		html +=	'</div>' ;
	}
	if (html == "") { html = "Nothing to show here yet"; }
	$("#streamPanel").prepend(html);
	$(".boundary").slideDown(800);
};

$(function() {
	$("#subTextPanel").html("<< Select a trend");
	$(".favorForm").live("submit", function() {
		var data = { profilePic: this.profilePic.value, pic: this.pic.value, from: this.from.value, caption: this.caption.value };
		var theForm = $(this);
		$.post("/setAsFavor", data, function (jqXHR) { 
			alert('Image added as a favorite'); 
			theForm.find("button").html("Image added in favorites").attr("disabled", "true"); 
		});
		return false;
	});
});
