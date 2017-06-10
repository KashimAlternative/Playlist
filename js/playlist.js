$.cookie.json = true;

const ERROR_TITLE = "Playlist";

var AJAX_PLAYLIST_SCRIPT = "cgi/playlist.php";

const MY_LIST_VER = "0.001";

const MODE_SHUFFLE = "shuffle";
const MODE_SEQUENTIAL = "sequential";
const MODE_REPEAT = "repeat";
const MODE_ONCE = "once";

var youtubePlayer = null;
var messageBox = null;
var querySpecified ={};

var isNoErrorReport = false;
var isFullFunctionEnable = false;

// Parse Query
var queries = location.search.replace( /^\?/ , "" ).split( "&" );
for( var i = 0 ; i < queries.length ; i++ ){
    var query = queries[i];

    if( /^playlist=/.test( query ) )
        querySpecified.playlist = query.replace( /^playlist=/ ,"" );

    if( /^song=/.test( query ) )
        querySpecified.song = query.replace( /^song=/ ,"" );

    if( /^mode=/.test( query ) )
        querySpecified.mode = query.replace( /^mode=/ ,"" );

    if( /^autostart=/.test( query ) )
        querySpecified.autostart = true;
}

//-- [Function] Alert Error
var alertError = function( title , received ){
    alert( "Error [" + title + "]\n\nCode : " + received.replace( "#ERROR:" , "" ) );
};

//-- [Function] Setup Youtube Player
var setupYoutubePlayer = function( videoId ){

    var playerEvents = {};
    playerEvents.onReady = onPlayerReady;
    playerEvents.onStateChange = onPlayerStateChange;
    playerEvents.onPlaybackRateChange = onPlayerPlaybackRateChange;
    playerEvents.onError = onPlayerError;

    var playerOption = {};
    playerOption.autoplay = "1";
    playerOption.rel = "0";
    playerOption.showinfo = "0";
    playerOption.iv_load_policy = "3";
    playerOption.hd = "1";
    playerOption.fs = "1";

    var playerSettings = {};
    playerSettings.width = "1920";
    playerSettings.height = "1080";
    playerSettings.videoId = videoId;
    playerSettings.events = playerEvents;
    playerSettings.playerVars = playerOption;

    YT.Player.prototype.getVideoId = function(){
        return this.getVideoData().video_id;
    };

    $( "#youtubePlayer" ).prepend( "<div id='playerSpace'>You need HTML5 Browser to view this video.</div>" );
    youtubePlayer = new YT.Player( 'playerSpace', playerSettings );
    youtubePlayer.isReady = false;
    youtubePlayer.isPlaying = false;
    youtubePlayer.playbackRate = 1.0;
    youtubePlayer.currentVideo = null;

};

//-- [Class] Playlist
var Playlist = function(){

    this.playlist = $( "<select></select>" );
    this.listOfPlaylist = $( "<select></select>" );

    this.shuffledPlaylist = $( "<select></select>" );

    this.videoIdList = {};

    this.isDumped = false;

    //-- [Function] Dump
    this.dump = function(){
        if( ! this.isDumped ){
            var playlist = $( "#songSelector" );
            playlist.html( this.playlist.html() );
            this.playlist = playlist;
            this.playlist.change( function(){ getSongData( $(this).val() ); });

            var listOfPlaylist = $( "#playlistSelector" );
            listOfPlaylist.html( this.listOfPlaylist.html() );
            this.listOfPlaylist = listOfPlaylist;
            this.listOfPlaylist.change( function(){ getSongs( $(this).val() ); });

            this.isDumped = true;
        }
    };

    //-- [Function] Add Playlist
    this.addPlaylist = function( id , title ){
        this.listOfPlaylist.append( "<option value='" + id + "'>" + title + "</option>" );
    };

    //-- [Function] Add Song
    this.addSong = function( id , videoId , title ){
        this.playlist.append( "<option value='" + id + "'>" + title + "</option>" );
        this.videoIdList[ id ] = videoId;
    };

    //-- [Function] Clear All Playlist
    this.clearListOfPlaylist = function(){
        this.listOfPlaylist.html( "" );
    };

    //-- [Function] Clear Playlist
    this.clearPlaylist = function(){
        this.playlist.html( "" );
        this.shuffledPlaylist.html( "" );
        this.videoIdList ={};
    };

    //-- [Function] Create Shuffled List
    this.createShuffledList = function(){

        var list = $.map( this.playlist.find( "option" ) , function( element ){
            return  $( element ).clone();
        });

        for( var i = 0 ; i < list.length ; i++ ){
            var j = Math.floor( Math.random() * list.length );
            var tmp = list[ i ];
            list[ i ] = list[ j ];
            list[ j ] = tmp;
        }

        this.shuffledPlaylist.html( "" );
        var shuffledPlaylist = this.shuffledPlaylist;
        $.each( list , function(){
            shuffledPlaylist.append( this );
        });

    };

    //-- [Function] Get Video ID
    this.getVideoId = function( id ){
        return this.videoIdList[ id ];
    };

    //-- [Function] Get Current Playlist
    this.getCurrentPlaylist = function(){
        return this.listOfPlaylist.val();
    };

    //-- [Function] Set Current Playlist
    this.setCurrentPlaylist = function( id ){
        return this.listOfPlaylist.val( id );
    };

    //-- [Function] Set Current Song
    this.setCurrentSong = function( id ){
        this.playlist.val( id );
        this.shuffledPlaylist.val( id );
    };

    //-- [Function] Get Current Song
    this.getCurrentSong = function(){
            if( this.getPlayMode() != MODE_SEQUENTIAL )
            return this.shuffledPlaylist.val();
        else
            return this.playlist.val();
    };

    //-- [Function] Get Current Song Title
    this.getCurrentSongTitle = function(){
        return this.playlist.children( "option[value=" + this.getCurrentSong() + "]" ).html();
    };

    //-- [Function] Get Current Video ID
    this.getCurrentVideoId = function(){
        return this.getVideoId( this.getCurrentSong() );
    };

    //-- [Function] Play Next Song
    this.playNextSong = function(){
        getSongData( playlist.getNextSong() );
    }

    //-- [Function] Play Prev Song
    this.playPrevSong = function(){
        getSongData( playlist.getPrevSong() );
    }

    //-- [Function] Get Next Song
    this.getNextSong = function(){

        var playingSong = this.playlist.val();

        var currentList = this.playlist;
        if( this.getPlayMode() != MODE_SEQUENTIAL )
            currentList = this.shuffledPlaylist;

        if( playingSong == currentList.children( "option:last" ).val() )
            return currentList.children( "option:first" ).val();
        else
            return currentList.children( "option[value='" + playingSong + "']" ).next( "option" ).val();

    };

    //-- [Function] Get Prev Song
    this.getPrevSong = function(){

        var playingSong = this.playlist.val();

        var currentList = this.playlist;
        if( this.getPlayMode() != MODE_SEQUENTIAL )
            currentList = this.shuffledPlaylist;

        if( playingSong == currentList.children( "option:first" ).val() )
            return currentList.children( "option:last" ).val();
        else
            return currentList.children( "option[value='" + playingSong + "']" ).prev( "option" ).val();

    };

    //-- [Function] Get Play Mode
    this.getPlayMode = function(){
        return $( "input[name='playMode']:checked" ).val();
    };

};

//-- [Event Listener] on Youtube API Ready
var onYouTubeIframeAPIReady = function() {
    console.log( "API Ready" );
    setupYoutubePlayer( null );
};

//-- [Event Listener] on YouTube Player Ready
var onPlayerReady = function( event ) {
    console.log( "Player Ready" );
    youtubePlayer.isReady = true;
    youtubePlayer.playbackRate = youtubePlayer.getPlaybackRate();

    if( querySpecified.autostart )
        youtubePlayer.setVideoById = youtubePlayer.loadVideoById;
    else
        youtubePlayer.setVideoById = youtubePlayer.cueVideoById;

    if( youtubePlayer.nextVideoId ){
        youtubePlayer.setVideoById( youtubePlayer.nextVideoId , 0 , "default" );
        youtubePlayer.nextVideoId = null;
    }

    startTimer();
    $( function(){
        if( $( "#btn_information" ).length > 0 )
            $( "#btn_information" ).click();
    });

};

//-- [Event Listener] on Player State Change
var onPlayerStateChange = function( event ) {

    console.log( "State Change: " + event.data );

    var isPauseButton = false;
    youtubePlayer.state = event.data;

    switch( event.data ){

    case YT.PlayerState.UNSTARTED:
        // Unstarted
        var newVideoId = youtubePlayer.getVideoId();
        $( "#" + youtubePlayer.currentVideo ).removeClass( "playing" );
        youtubePlayer.currentVideo = newVideoId;
        $( "#" + youtubePlayer.currentVideo ).addClass( "playing" );
        isChordEnable = ( newVideoId == playlist.getCurrentVideoId() );

        $( "#tbxSeekPosition" ).val( 0 );

        break;

    case YT.PlayerState.ENDED:
        // Ended

        youtubePlayer.isPlaying = true;

        switch( playlist.getPlayMode() ){

        case MODE_REPEAT:
            youtubePlayer.playVideo();
            break;
        case MODE_SHUFFLE:
        case MODE_SEQUENTIAL:
            getSongData( playlist.getNextSong() );
            break;
        case MODE_ONCE:
            break;
        }

        break;

    case YT.PlayerState.PLAYING:
        // Playing
        youtubePlayer.isPlaying = true;
        isPauseButton = true;

        timeOffset = new Date().getTime() - Math.round( youtubePlayer.getCurrentTime() * 1000.0 );

        if( isNoErrorReport ){
            reportError( 0 );
            isNoErrorReport = false;
        };
        
        break;

    case  YT.PlayerState.PAUSED:
        // Paused
        youtubePlayer.isPlaying = false;
        break;

    case  YT.PlayerState.BUFFERING:
        // Buffering
        break;

    case  YT.PlayerState.CUED:
        // Cued
        if( youtubePlayer.isPlaying )
            youtubePlayer.playVideo();
        break;

    }

    if( isPauseButton )
        $( "#btnPlayPause" ).html( $( "#textPause" ).val() );
    else
        $( "#btnPlayPause" ).html( $( "#textPlay" ).val() );

};

//-- [Event Listener] on Player Playback Rate Change
var onPlayerPlaybackRateChange = function( event ) {
    console.log( "Playback Rate Change: " + event.data);
    youtubePlayer.playbackRate = event.data;
};

//-- [Event Listener] on Player Error
var onPlayerError = function( event ) {

    console.log( "Player Error: " + event.data );

    if( youtubePlayer.getVideoId() != playlist.getCurrentVideoId() )   return;
    
    if( event )
        reportError( event.data );

    getSongData( playlist.getNextSong() );
};

//-- [Function] Report Error
var reportError = function( errorCode ){

    var ajaxParam = { mode: "log" , type: ( errorCode == 0 ? "noerror" : "error" ) };

    ajaxParam[ "song" ] = playlist.getCurrentSong();

    if( errorCode != 0 )
        ajaxParam[ "errorCode" ] = errorCode;
    
    $.postJSON( AJAX_PLAYLIST_SCRIPT , ajaxParam , function( data ){
        
        if(  data.result != "OK" ){
            alertError( ERROR_TITLE , data.message );
            return;
        }
        
    });
};

//-- [Function] Get All Playlists
var getPlaylists = function(){

    $.postJSON( AJAX_PLAYLIST_SCRIPT , { mode : "get" , type: "playlists" } , function( data ){

        if( data.result != "OK" ){
            alertError( ERROR_TITLE , data.message );
             return;
        }

        playlist.clearListOfPlaylist();

        $.each( data.playlists , function(){
            playlist.addPlaylist( this.id , this.title );
        });

        if( querySpecified.playlist ){
            playlist.setCurrentPlaylist( querySpecified.playlist );
            querySpecified.playlist = null ;
        }

        getSongs( playlist.getCurrentPlaylist() );

        var mylist = $.cookie( "mylist" );
        if( mylist ){
            if( mylist.version < MY_LIST_VER )
                $.cookie( "mylist" , null );
            else
                playlist.addPlaylist( "#mylist" , "MyList" );
        }

        console.log( "execTime: " + data.execTime * 1000 + " ms" );
    });

};

//-- [Function] Get Playlist
var getSongs = function( playlistSelect ){

    playlist.listOfPlaylist.attr( "title" , playlistSelect );

    if( playlistSelect == "#mylist" ){

        playlist.clearPlaylist();

        var mylist = $.cookie( "mylist" );
        for( var i in mylist.songs ){
            var song = mylist.songs[i];
            playlist.addSong( song.filename ,  song.id , song.title );
        }
        playlist.createShuffledList();
        setUnlistedVideo( playlist.getCurrentVideoId() );

        return;
    }

    var ajaxParam = { mode : "get" , type: "songs" };
    ajaxParam[ "playlist" ] = playlistSelect;

    $.postJSON( AJAX_PLAYLIST_SCRIPT , ajaxParam , function( data ){

        if( data.result != "OK" ){
            alertError( ERROR_TITLE , data.message );
             return;
        }

        playlist.clearPlaylist();

        $.each( data.songs , function(){
/*
            if( ! this.title ){
                var songData = this;
                var parameters = [];
                parameters.push( YOUTUBE_API_KEY );
                parameters.push( "part=snippet" );
                parameters.push( "id=" + this.videoId );

                $.getJSON( URL_YOUTUBE_API + "videos?" + parameters.join( "&" ) , function( json ){
                    if( json.items.length <= 0 )   return;
                    var title = json.items[0].snippet.title;

                    playlist.addSong( songData.file , songData.videoId , title );

                });
                return true;
            }
*/
            playlist.addSong( this.id , this.videoId , this.title );
        });

        playlist.createShuffledList();

        if( querySpecified.song ){
            getSongData( querySpecified.song );
            querySpecified.song = null ;
        }
        else if( false && $( "#currentFileName" ).val() ){
            getSongData( $( "#currentFileName" ).val() );
            $( "#currentFileName" ).val( "" );
        }
        else{
            getSongData( playlist.getCurrentSong() );
        }

        console.log( "execTime: " + data.execTime * 1000 + " ms" );
    });

};

var closeSearchResult = null;
//-- [Function] Get Song Data
var getSongData = function( songSelect ){

    playlist.playlist.attr( "title" , songSelect );

    var ajaxParam = { mode: "get" , type: "songData" };
    ajaxParam[ "song" ] = songSelect;

    playlist.setCurrentSong( songSelect );

    if( youtubePlayer ){
        var videoId = playlist.getVideoId( songSelect );

        if( youtubePlayer.isReady )
            youtubePlayer.setVideoById( videoId , 0 , "default" );
        else
            youtubePlayer.nextVideoId = videoId;

        if( closeSearchResult )
            closeSearchResult();
    }

    $.postJSON( AJAX_PLAYLIST_SCRIPT , ajaxParam , function( data ){

        if( data.result != "OK" ){
            alertError( ERROR_TITLE , data.message );
            onPlayerError( null );
             return;
        }

        var fileName = data.query.song;
        var videoId = data.songData.videoId;

        $( "#currentFileName" ).val( fileName );
        $( "#chordTimeStamp" ).val( data.songData.timestampChord );
        $( "#chordHistory" ).val( data.songData.chordHistory );
        $( "#chordSourceBackup" ).val( data.songData.chordData );
        $( "#chordSource" ).val( data.songData.chordData ).change();

        $( "#videoInformation" ).css( "overflow-y" , "hidden" );

        var informationTable = $( "#informationTable" );

        informationTable.find( "tr" ).hide();

        $.each( data.songData , function( key ,value ){

            if( ! value )   return;;
            
            if( key == "variations" ){

                var variations = $.map( [ { id: videoId , title: "Default" } ].concat( value ) , function( element ){
                    return "<span class='variationLink'>" + element.title + "<span class='videoId hidden'>" + element.id + "</span></span>";
                });

                informationTable.find( "#variations" ).show().find( "td.value" ).html( variations.join( "<br>" ) );

            }
            else if( /\S/.test( value ) ){
                informationTable.find( "#" + key ).show().find( ".value" ).html( value );

                if( key == "remark" || key == "variations" )
                    informationTable.find( "#spacer" ).show();
            }

        });

        $( "#openSongDataEditor" ).css( "visibility" , "visible" );
        //    messageBox.show( data.songData.title );

        setSongDataToEdit( data.songData );

        if( data.songData.errorCount != 0 )
            isNoErrorReport = true;
        
        console.log( "execTime: " + data.execTime * 1000 + " ms" );
    });

};

playlist = new Playlist();
getPlaylists();

$(function(){

    playlist.dump();

    isFullFunctionEnable = ( $( "div#fullFunction" ).length > 0 );

    //-- [Event] Key Down
    $( window ).keydown(function( event ){

        if( event.ctrlKey ){
            switch( event.keyCode ){
            case 32: // Space Key
                $( "#btnPlayPause" ).click();
                break;

            case 37: // Left Key
                $( "#btnPrevSong" ).click();
                break;

            case 39: // Right Key
                $( "#btnNextSong" ).click();
                break;

            }
        }

    });

    //-- [Function] Song Selector
    $( "#songSelector" ).click( function( event ){
        if( youtubePlayer.getVideoId() != playlist.getCurrentVideoId() ){
            event.preventDefault();
            $( this ).change();
        }
    });

    //-- [Function] Add MyList
    $( "#addMyList" ).click( function( event ){

        var mylist = $.cookie( "mylist" );
        var isDeleted = false;

        if( mylist == null ){
            mylist = {};
            mylist.version = MY_LIST_VER;
            mylist.songs = []
            playlist.addPlaylist( "#mylist" , "MyList" );
        }
        else{
            for( var i in mylist.songs ){
                if( mylist.songs[i].id == youtubePlayer.currentVideo ){
                    mylist.songs.splice( i , 1 );
                    isDeleted = true;
                     break;
                }
            }
        }

        if( ! isDeleted ){
            var songInfo = {};
            songInfo.id = youtubePlayer.currentVideo;
            if( playlist.getCurrentVideoId() == youtubePlayer.currentVideo ){
                songInfo.title = playlist.getCurrentSongTitle();
//                songInfo.filename = playlist.getCurrentSong();
                songInfo.filename = "#" + songInfo.id;
            }
            else{
                songInfo.title = $( "#informationTable #other table td:first" ).html();
                songInfo.filename = "#" + songInfo.id;
            }
            mylist.songs.push( songInfo );
        }

        $.cookie( "mylist" , mylist , { expire: 365 } );

        if( playlist.getCurrentPlaylist() == "#mylist" )
            getSongs( "#mylist" );

    });

  //-- [Function] Another Variation Link
    $( document ).on( "click" , "span.variationLink" , function(){

        if( ! youtubePlayer )   return;

        var videoId = $( this ).find( ".videoId" ).html();

        if( videoId != youtubePlayer.getVideoId() )
            youtubePlayer.setVideoById( videoId , 0 , "default" );

    });

    //-- [Event] Play/Pause Button
    $( "#btnPlayPause" ).click( function(){

        if( ! youtubePlayer )   return;

        switch( youtubePlayer.state ){

        case YT.PlayerState.PLAYING:
        case YT.PlayerState.BUFFERING:
            youtubePlayer.pauseVideo();
            break;

        case YT.PlayerState.UNSTARTED:
        case YT.PlayerState.ENDED:
        case YT.PlayerState.PAUSED:
        case YT.PlayerState.CUED:
            youtubePlayer.playVideo();
            break;

        }

    });

    //-- [Event] Prev Song Button
    $( "#btnPrevSong" ).click( function(){
        getSongData( playlist.getPrevSong() );
    });

    //-- [Event] Next Song Button
    $( "#btnNextSong" ).click( function(){
        getSongData( playlist.getNextSong() );
    });

    $( "#tbxSeekPosition" ).change( function(){
        $( this ).val( $( this ).val().replace( /[\uFF0E\uFF10-\uFF19]/g , function( s ){ return String.fromCharCode( s.charCodeAt(0) - 0xFEE0 ) ; } ) );
    });

    //-- [Event] Seek Button
    $( "#btnSeek" ).click( function(){
        if( ! youtubePlayer )   return;

        var seekPosition = $( "#tbxSeekPosition" ).val();

        if( ! /\S/.test( seekPosition ) )   return;

//        seekPosition = seekPosition.replace( /[\uFF0E\uFF10-\uFF19]/g , function( s ){ return String.fromCharCode( s.charCodeAt(0) - 0xFEE0 ) ; } );

        if( ! /\d+(\.\d+)?/.test( seekPosition ) ){
            alert( "Invalid Input !!" );
            return;
        }

        $( "#tbxSeekPosition" ).val( seekPosition );

        var position =  Number( seekPosition );
        if( $( "#lblSeekUnit" ).html() == "ms" )   position /= 1000.0;

        youtubePlayer.seekTo( position , true );
        if( youtubePlayer.state != YT.PlayerState.PLAYING )
            youtubePlayer.playVideo();

    });

    //-- [Event] Change Unit ( sec <-> msec )
    $( "#lblSeekUnit" ).click( function(){

        try{
            var num = Number( $( "#tbxSeekPosition" ).val() );
            if( $( this ).html() == "ms" )
                $( "#tbxSeekPosition" ).val( Math.round( num / 1000 ) );
            else
                $( "#tbxSeekPosition" ).val( num * 1000 );
        }
        catch(e){
        }

        if( $( this ).html() == "ms" )
            $( this ).html( "sec" );
        else
            $( this ).html( "ms" );
    });

    //-- [Event] Play Mode Selector
    $( "button.playMode" ).click( function(){
        var input = $( this ).prev( "input" );
        $( "input[name='playMode']" ).val( [ input.val() ] );

        $( this ).blur();

        if( playlist.getPlayMode() == MODE_SHUFFLE )
            playlist.createShuffledList();
    });

    if( $.prototype.modal ){

        //-- [Modal Window] Song Data Editor
        $( "#songDataEditor" ).modal( {
            close: "#closeSongDataEditor" ,
            overlay: "rgba( 255, 255, 255, 0.64 )" ,
            duration: 200
        });

        //-- [event] Open Song Data Editer
        $( "#openSongDataEditor" ).click( function(){
            var editor = $( "#editorFrame" );
            editor.attr( "src" , "data_editor/data_editor.html" );
            $( "#songDataEditor" ).openModal( 200 );
        });

    }

    if( querySpecified.mode )
        $( "input[name='playMode'][value='" + querySpecified.mode + "']" ).next( "button" ).click();
    else
        $( "input[name='playMode']:first" ).next( "button" ).click();

    $( "#btnPlayPause" ).html( $( "#textPlay" ).val() );

//    messageBox = new MessageBox();

    // ================================
    // for Mobile
    //-- [Event] Tab Button
    $( "input.tabButton" ).click( function(){

        var id = $( this ).attr( "id" ).replace( /.*\_/  , "" );

        var tabPage = $( "div#" + id );

        if( id == "chord" )
            startTimer();
        else
            stopTimer();

        if( tabPage.css( "display" ) == "none" ){
            $( "div.tabPage" ).hide();
            tabPage.show();
            $( "input.tabButton" ).removeClass( "infoButtonPressed" );
            $( this ).addClass( "infoButtonPressed" );
        }

        $( this ).blur();
    });
    // ================================

});
