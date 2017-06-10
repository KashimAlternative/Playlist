var songDataEditor = null;

var setSongDataToEdit = function( data ){

    songDataEditor.find( "#timestamp" ).val( data.timestamp );

    songDataEditor.find( "#title" ).val( data.title );
    songDataEditor.find( "#videoId" ).val( data.videoId );
    songDataEditor.find( "#lyric" ).val( data.lyric );
    songDataEditor.find( "#music" ).val( data.music );
    songDataEditor.find( "#arrange" ).val( data.arrange );
    songDataEditor.find( "#vocal" ).val( data.vocal );
    songDataEditor.find( "#remark" ).val( data.remark );


};

/*
var variationTr = $( "<tr class='variation'></tr>" );
variationTr.append( "<td class='variation id'><input type='text' class='variation id'></td>" );
variationTr.append( "<td class='variation title'><input type='text' class='variation title'></td>" );
variationTr.append( "<td><button class='variation add'>&plus;</button></td>" );
variationTr.append( "<td><button class='variation remove'>&minus;</button></td>" );
*/

//-- [Function] Upload Data
var uploadData = function(){

    var ajaxParams = { mode: "set" , type: "songData" };
    ajaxParams.song = playlist.getCurrentSong() ;

    var songData = {};
    $.each( $( "#songDataToEdit tr" ) , function(){
	var input = $( this ).find( "input" )
	songData[ input.attr( "id" ) ] = input.val();
    });
/*
    var variations = [];
    $.each( $( "#songVariationsToEdit" ) , function(){
	var id = $( this ).find( "input.id" ).val()
	var title = $( this ).find( "input.title" ).val()

	if( id == "" || title == "" )
	    return true

	variations.push( { id: id , title: title } );

    });

    if( variations.length > 0 )
	songData.variation = variations;
*/

//    ajaxParams.data = JSON.stringify( { timeStamp:  , passphrase: $( "#passphrase" ).val() , songData: songData } );
    ajaxParams.songData = JSON.stringify( songData );
    ajaxParams.timestamp = songDataEditor.find( "#timestamp" ).val();
    
    $.postJSON( AJAX_PLAYLIST_SCRIPT , ajaxParams , function( data ){
	
	if( data.result != "OK" ){
            alertError( ERROR_TITLE , data.message );
 	    return;
	}

        $( "#dataTimeStamp" ).val( data.songData.timestamp );
        
	alert( 'OK' );
	
    });
};

$(function(){

    songDataEditor = $( "#songDataEditor" );
    
    //-- [event] Add Variation
    $( document ).on( "click" , ".variation.add" , function(){
	$( this ).parents( "tr.variation" ).after( variationTr.clone() );
	$( "button.variation.remove" ).css( "visibility" , "visible" );
    });
    
    //-- [event] Remove Variation
    $( document ).on( "click" , ".variation.remove" , function(){
	$( this ).parents( "tr.variation" ).remove();
	if( $( "tr.variation" ).length == 1 )
	    $( "button.variation.remove" ).css( "visibility" , "hidden" );
    });

    //-- [event] Upload Button
    $( "button#uploadSongData" ).click( function(){

	if( !( /\S/.test( $( "input#listName" ).val() ) ) ){
	    alert( "Input \"Playlist Name\"" );
	    return;
	}

	if( !( /\S/.test( $( "input#fileName" ).val() ) ) ){
	    alert( "Input \"File Name\"" );
	    return;
	}

	if( !( /\S/.test( $( "input#videoId" ).val() ) ) ){
	    alert( "Input \"Video ID\"" );
	    return;
	}

	if( !( /\S/.test( $( "input#Title" ).val() ) ) ){
	    alert( "Input \"Title\"" );
	    return;
	}
	
	uploadData();
    });

    //-- [event] Delete Button
    $( "button#new" ).click( function(){
	$( "#fileName" ).removeAttr( "readonly" ).val( "" );
	$( ".data input" ).val( "" );
    });	    
  /*
    var variations = $( "#variations" );
    variations.append( variationTr.clone() );
    $( "#variations" ).find( "tr" ).removeClass( "variation" );
    $( "#variations" ).find( "td" ).html( "" );
    $( "#variations" ).find( "td.id" ).html( "ID:" );
    $( "#variations" ).find( "td.title" ).html( "Title:" );

    $( "#variations" ).append( variationTr.clone() );
    $( "button.variation.remove" ).css( "visibility" , "hidden" );
*/
//    getCurrentLists();
//    getSongData();
    
});
