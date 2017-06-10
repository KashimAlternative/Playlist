const URL_YOUTUBE_API = "https://www.googleapis.com/youtube/v3/";
const YOUTUBE_API_KEY = "key=AIzaSyBKdvY9ygc2mwAF_6yyOz9K9HhyjzP91uA";

//-- [Function] Close Search Result
function closeSearchResult(){
    $( "#searchResult" ).parent( ".base" ).slideUp( 300 );
}

//-- [Function] Search Video
var searchVideo = function( searchWord , pageToken ){

    var parameters = new Array();

    parameters.push( YOUTUBE_API_KEY );
    parameters.push( "part=snippet" );
    parameters.push( "type=video" );
    parameters.push( "maxResults=20" );
    parameters.push( "q=" + searchWord );

    if( pageToken )
        parameters.push( "pageToken=" + pageToken );
    else
        $( "#searchResult" ).html( "" );

    $.getJSON( URL_YOUTUBE_API + "search?" + parameters.join( "&" ) ,function( json ){

        $( "#searchResult .getMoreResult" ).remove();

        $.each( json.items , function(){

            var videoId = this.id.videoId;
            var imageUrl = this.snippet.thumbnails.high.url;
            var title = this.snippet.title;
            var description = this.snippet.description;

            var resultItem = $( "<div class='resultItem'><a></a></div>" );

            resultItem.find( "a" )
                .attr( "id" , videoId )
                .attr( "title" , title )
                .attr( "href" , "https://youtube.com/watch?v=" + videoId )
                .html( "<img class='thumbnail' src='" + imageUrl + "'><span class='title'>" + title + "</span>" );

            $( "#searchResult" ).append( resultItem );

            var parameters = [];
            parameters.push( YOUTUBE_API_KEY );
            parameters.push( "part=snippet,contentDetails" );
            parameters.push( "id=" + videoId );

            $.getJSON( URL_YOUTUBE_API + "videos?" + parameters.join( "&" ) , function( json ){

                if( json.items.length <= 0 )   return;

                var videoId = json.items[0].id;
                var snippet = json.items[0].snippet;
                var details = json.items[0].contentDetails;
                var date = new Date( snippet.publishedAt );

                var durationData = details.duration.match( /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/ );
                durationData.shift();

                duration = $.map( durationData , function( num , i ){ if( !num ) return "00"; else return ( "0" + num ).slice(-2); } ).join( ":" );

                $( "#" + videoId ).append( "<span class='duration'>" + duration + "</span>");

            });

        });

        var prevPageToken = json.prevPageToken;
        var nextPageToken = json.nextPageToken;

        var nextButton = $( "<button>More</button>" );
        nextButton.addClass( "getMoreResult" );
        nextButton.append( $( "<span></span>" ).addClass( "nextToken" ).html( nextPageToken ) );
        nextButton.append( $( "<span></span>" ).addClass( "searchWord" ).html( searchWord ) );
        nextButton.find( "span" ).addClass( "hidden" );

        $( "#searchResult" ).append( nextButton );

        $( "#searchResult" ).parent( ".base" ).slideDown( 300 );

    });

};

//-- [Function] Set Unlisted Video
var setUnlistedVideo = function( videoId ){

    if( youtubePlayer.getVideoId() == videoId )   return;

    youtubePlayer.loadVideoById( videoId );

    $( "#informationTable tr" ).hide();
    $( "#chordHistory" ).val( "" );
    $( "#chordSourceBackup" ).val( "" );
    $( "#chordSource" ).val( "" ).change();

    var parameters = [];
    parameters.push( YOUTUBE_API_KEY );
    parameters.push( "part=snippet" );
    parameters.push( "id=" + videoId );

    $.getJSON( URL_YOUTUBE_API + "videos?" + parameters.join( "&" ) , function( json ){

        if( json.items.length <= 0 )   return;

        var snippet = json.items[0].snippet;
        var date = new Date( snippet.publishedAt );

        $( "#videoInformation" ).css( "overflow-y" , "scroll" );

        var infoContents = "";
        infoContents += "<table>";
        infoContents += "<tr><td>" + snippet.title + "</td></tr>";
        infoContents += "<tr><td><hr></td></tr>";
        infoContents += "<tr><td>" + snippet.description.split( "\n" ).join( "<br>" ) + "</td></tr>";
        infoContents += "</table>";

        $( " #informationTable tr#other td.value" ).html( infoContents );
        $( " #informationTable tr#other" ).show();

        $( "input[name='playMode'][value='repeat']" ).next( "button" ).click();

        $( "#openSongDataEditor" ).css( "visibility" , "hidden" );

    });

};

$(function(){

    $( "#searchResult" ).css( "overflow-x" , "scroll" ).parents( ".base" ).hide();

    $( "#url" ).keypress( function(){
        var keyword = $( this ).val();
        var uri = "/playlist/cgi/search_proxy.php?word=" + keyword;

        if(! /\S/.test( keyword ) ){
            $( "#urlList" ).html( "" );
            return;
        }
        
//        $.getJSON( uri , null , function( data ){
        $.ajax({
            url: "/playlist/search_proxy.php?word=" + keyword,
            dataType: 'jsonp',
            jsonCallback: 'incSearch'
        }).then(
            function( json ){
            console.log( data[0] );
            
            var options = $.map( data[ 1 ] , function( item , i ){
                return "<option>" + item[0] + "</option>";
            });

            $( "#urlList" ).html( options );

            },
            null
        );
            
//        });
    });
    
    //-- [event] Enter URL Search
    $( "#urlSearch" ).submit( function( event ){
        event.preventDefault();

        var inputText = $( this ).find( "#url" ).blur().val();

        if( inputText == "" ){
            closeSearchResult();
            return;
        }

        try{
            var url = new URL( inputText );

            var videoId = null;

            switch( url.host ){
            case "www.youtube.com":
            case "youtube.com":
                videoId = url.search.match( /v=(.{11})/ )[1];
                break;
            case "youtu.be":
                videoId = url.pathname.match( /\/(.{11})/ )[1];
                break;
            }

            if( videoId ){
                setUnlistedVideo( videoId );
                closeSearchResult();
            }
            else
                throw new Error();

        }
        catch( e ){
            searchVideo( inputText );
            return;
        }

    });

    //-- [event] Play Item
    $( document ).on( "click" , ".resultItem a" ,function( event ){
        event.preventDefault();
        setUnlistedVideo( $( this ).attr( "id" ) );
    });

    //-- [event] Get More Result
    $( document ).on( "click" , ".getMoreResult" ,function( event ){
        var searchWord = $( this ).find( ".searchWord" ).html();
        var token = $( this ).find( ".nextToken" ).html();
        searchVideo( searchWord , token );
    });

    //-- [event] Scroll
    $( "#searchResult" ).scroll( function( event ){
        if( ( $( "#searchResult .getMoreResult" ).position().left - $( this ).width() ) < 100 ){
            $( "#searchResult .getMoreResult" ).click().remove();
        }
    });
    
});
