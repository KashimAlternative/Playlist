var timerInterval = 10;
var driftCorrectThreshold = 50;
var driftResetThreshold = 100;

var chordFragments = null;
var tempoTable = null;

var currentVideoTime = 0;

var isChordEditting = false;
var isChordEnable = false;

var timeOffset =  new Date().getTime();
var lastApiTime = null;
var driftCorrection = 0;

var prevBeat = -1;
var prevTarget = {};
var prevTargetNext = {};
prevTarget.obj = $();
prevTarget.index = null;
prevTargetNext = $();

var currentTimeDisplay = null;
var currentBeatDisplay = null;
var driftMeter = null;
$(function(){
    currentTimeDisplay = $( "#currentTime" );
    currentBeatDisplay = $( "#currentBeat" );
    driftMeter = $( "#driftBar" );
    driftMeter.attr( "min" , "0" );
    driftMeter.attr( "max" , driftResetThreshold );
    driftMeter.attr( "optimum" , "1" );
    driftMeter.attr( "low" ,  driftCorrectThreshold );
    driftMeter.attr( "high" , driftResetThreshold );
});

$.extend( jQuery.easing , {
    easeInOut : function(x, t, b, c, d) {
        if( x < 0.5 )
            return ( 4.0 * Math.pow( x , 3 ) );
        else
            return ( 4.0 * Math.pow( x - 1.0 , 3 ) ) + 1.0 ;
    },
    cubic: function(x, t, b, c, d) {
        return Math.pow( x , 3 );
    },
    cubicInv: function(x, t, b, c, d) {
        return Math.pow( ( x - 1 ) , 3 ) + 1;
    }
});

var timer = null;

//-- [Function] Start Timer
function startTimer(){
    if( timer )   return;
    timer = setInterval( scanTime , timerInterval );
}

//-- [Function] Stop Timer
function stopTimer(){
    if( ! timer )   return;
    clearInterval( timer );
    timer = null;
}

//-- [Function] Scan Time
var scanTime = function(){

    if( youtubePlayer.state != YT.PlayerState.PLAYING )   return;
    if( youtubePlayer.playbackRate != 1.0 )   return;

    var clockTime = new Date().getTime();
    var apiTime = youtubePlayer.getCurrentTime();

    if( isNaN( apiTime ) )   return;

    if( apiTime != lastApiTime ){
        lastApiTime = apiTime;

        apiTime = Math.round( apiTime * 1000.0 );

        var drift = ( clockTime - timeOffset ) - apiTime;

        if( Math.abs( drift ) > driftResetThreshold ){
            timeOffset = clockTime - apiTime ;
            driftCorrection = 0;
        }
        else if( ( drift < 0 ) || ( driftCorrectThreshold < drift ) ){
            driftCorrection = drift;
        }

        if( isFullFunctionEnable )
            driftMeter.val( drift );
    }

    if( driftCorrection !== 0 ){
        if( driftCorrection > 0 ){
            timeOffset++;
            driftCorrection--;
        }
        else{
            timeOffset--;
            driftCorrection++;
        }
        if( isFullFunctionEnable )
            driftMeter.val( driftCorrection );
    }

    currentVideoTime = clockTime - timeOffset;

    if( isFullFunctionEnable )
        //currentTimeDisplay.val( currentVideoTime );
        currentTimeDisplay[0].value = currentVideoTime;

    if( !tempoTable ) return;

    if( isFullFunctionEnable ){
        for( var i = tempoTable.length -1 ; i >= 0 ; i-- ){
            var tempoInfo = tempoTable[i];
            if( tempoInfo.time <= currentVideoTime ){
                var beat = tempoInfo.getBeat( currentVideoTime );

                if( beat != prevBeat ){
                    currentBeatDisplay.val( beat + " @ " + currentVideoTime + "ms" + " / \u2669=" + tempoInfo.tempo );
                    prevBeat = beat;
                }

                break;
            }
        }
    }

    if( ! chordFragments )   return;
    if( ! isChordEnable ) return;

    var nextChord = null;
    for( var i = chordFragments.length - 1 ; i >= 0 ; i-- ){
        if( chordFragments[i].time <= currentVideoTime ) {

            if( prevTarget.index != i ){
                prevTargetNext.removeClass( "chordFragmentNext" );
                prevTargetNext = nextChord.object.addClass( "chordFragmentNext" );

                prevTarget.obj.removeClass( "chordFragmentCurrent" );
                prevTarget.obj = chordFragments[i].object.addClass( "chordFragmentCurrent" );

                prevTarget.index = i;
            }

            break;
        }
        nextChord = chordFragments[i];
    }

};

var CHORD_DATA_REPLACE_TABLE = [
    [ "\\|([^| ])" , "| $1" ],
    [ "([^| ])\\|" , "$1 |" ],
    [ ",([^ ])"    , ", $1" ],

//  [ "([A-G])#(((m|M|dim|aug)[^A-Za-z]|sus[24]|[^0248A-Za-z]))" , "$1&#9839;$2" ] ,
    [ "([A-G])#" , "$1&#9839;"] ,
//    [ "([A-G])b(((m|M|dim|aug)[^A-Za-z]|sus[24]|[^0248A-Za-z]))" , "$1&#9837;$2" ] ,
    [ "([A-G])b([5679]|m[^a-z]|M[^A-Z]|dim|aug|sus[24]|[^0-9A-Za-z])" , "$1&#9837;$2" ] ,

    [ "<red>" , "<span style='color:red;'>" ] ,
    [ "<blue>" , "<span style='color:#00E0E0;'>" ] ,
    [ "<tempo(( +(\\d+(\\.\\d+)?)@(\\d+(\\.\\d+)?)(#\\d+)?)+)/>" , "<span class='tempoInfo' style='display:none;'>$1</span>" ] ,
    [ "<frag(( +((b(!?\\d+)?_-?\\d+((\\.\\d+)|([\\+\\-]\\d+/[1-9]+))?)|(t_\\d+)|([lo](_\\d+)+)))*)>" , "<span class='chordFragment$1'>" ] ,
    [ "<limit(( +\\d+)+)>" , "<span class='loopLimit$1'>" ] ,
    [ "<block(( +\\d+:-?\\d+(\\.\\d+)?)*)>" , "<span class='chordBlock$1'>" ] ,
    [ "</(red|blue|tempo|frag|limit|block)>"  , "</span>" ] ,

    [ "<(tempo|frag|limit|block)[^<>]*>" , "<span class=\"chordError\">" ] ,
    [ "\\\\\\n" , "" ] ,
    [ "\\\\$" , "" ] ,
    [ "(<br>)?\\n+" , "<br>" ]
];

//-- [function] Parse Chord Data
var parseChordData = function( source , history ){

    if( history ){
        var historyModified = history;
        $.each( CHORD_DATA_REPLACE_TABLE , function(){
            historyModified = historyModified.replace( new RegExp( this[0] , "g" ) , this[1] );
        });
        $( "#historyDisplay" ).html( historyModified );
    }
    else{
        $( "#historyDisplay" ).html( "" );
    }

    chordFragments = null;
    tempoTable = null;

    currentBeatDisplay.val( "" );
    prevBeat = -1;

    if( !( source && source !== "" ) ){
        $( "#chordDisplay" ).html( "No Data" );
        return;
    }

    var sourceModified = source;

    $.each( CHORD_DATA_REPLACE_TABLE , function(){
        sourceModified = sourceModified.replace( new RegExp( this[0] , "g" ) , this[1] );
    });

    var chordDisplay = $( "#chordDisplay" );

    chordDisplay.html( sourceModified );

    if( chordDisplay.find( "span.tempoInfo" ).length != 1 ) return;

    const REGEXP_FOR_TEMPO = "(\\d+(?:\\.\\d+)?)@(\\d+(?:\\.\\d+)?)(?:#(\\d+))?";

    tempoTable = [];
    $.each( chordDisplay.find( "span.tempoInfo" ).html().match( new RegExp( REGEXP_FOR_TEMPO , "g" ) ) , function(){
        var classInfo = this.match( new RegExp( REGEXP_FOR_TEMPO ) );

        var tempo = Number( classInfo[1] );
        var startBeat = Number( classInfo[2] );
        var startTime = null;
        if( classInfo[3] )
            startTime = parseInt( classInfo[3] );

        tempoTable.push( { beat: startBeat , tempo: tempo , time: startTime } );

    });

    if( tempoTable.length <= 0 )   return;

    tempoTable.sort( function( a , b ){
        return a.beat - b.beat;
    });

    var lastTempoInfo = null;
    $.each( tempoTable , function(){

        if( ! this.time ){
            if( !lastTempoInfo ) return;
            this.time = lastTempoInfo.getTime( this.beat );
        }

        this.getTime = function( beat ){
            return this.time + Math.round( ( beat - this.beat ) * 60000.0 / this.tempo );
        };

        this.getBeat = function( time ){
            return this.beat + Math.floor( ( time - this.time ) * this.tempo / 60000.0 );
        };

        lastTempoInfo = this;

    });

    chordFragments = [];
    rawTimes = []

    $.each( chordDisplay.find( "span.chordBlock" ) , function(){
        var block = $( this );
        var blockClass = block.attr( "class" );

        var fragments = [];
        $.each( block.find( "span.chordFragment" ) , function(){
            var fragment = $( this );
            var fragmentClass = fragment.attr( "class" );

            var parent = fragment.parents( "span.loopLimit" );

            var chordName = fragment.html().replace( /<\/?span[^<>]*>/g , "" ).replace( /\|.*/ , "" );

            var classData = fragmentClass.match( /([lo])((_\d+)+)/ );

            var loopLimit = null;
            var loopOmit = null;

            var parseInt_ = function(i){ return parseInt(i); };

            if( parent.length == 1 ){
                loopLimit = $( parent[0] ).attr( "class" ).match( /\d+/g ).map( parseInt_ );
            }
            else if( classData ){
                switch( classData[1] ){
                case "l":
                    loopLimit = classData[2].replace( /^_/ , "" ).split( "_" ).map( parseInt_ );
                    break;
                case "o":
                    loopOmit = classData[2].replace( /^_/ , "" ).split( "_" ).map( parseInt_ );
                    break;
                }
            }

            const REGEXP_FOR_FRAGMENT = "b(?:(!?)(\\d+))?_(-?\\d+(?:\\.\\d+)?)(([\\+\\-]\\d+)/([1-9]+))?";

            $.each( fragmentClass.match( new RegExp( REGEXP_FOR_FRAGMENT , "g" ) ) , function(){
                var classData = this.match( new RegExp( REGEXP_FOR_FRAGMENT ) );
                fragment.removeClass( classData[0] );

                var fragmentBeat = Number( classData[3] )

                if( classData[4] )
                    fragmentBeat += Number( classData[5] ) / Number( classData[6] );

                if( classData[2] ){
                    if( classData[1] == "!" )
                        fragments.push( { beat: fragmentBeat , limit: loopLimit , omit: [ parseInt( classData[2] ) ] , obj: fragment } );
                    else
                        fragments.push( { beat: fragmentBeat , limit: [ parseInt( classData[2] ) ] , omit: loopOmit , obj: fragment } );
                }
                else{
                    fragments.push( { beat: fragmentBeat , limit: loopLimit , omit: loopOmit , obj: fragment } );
                }
            });

            $.each( fragmentClass.match( /t_(\d+)/g ) , function(){
                var classData = this.match( /t_(\d+)/ );
                var fragmentTime = Math.round( Number( classData[1] ) );
                if( rawTimes.indexOf( fragmentTime ) < 0 )
                    rawTimes.push( { time: fragmentTime , object:fragment } );
            });

        });

        const REGEXP_FOR_BLOCK = "(\\d+):(-?\\d+(?:\\.\\d+)?)";

        $.each( blockClass.match( new RegExp( REGEXP_FOR_BLOCK , "g" ) ) , function(){
            var classData = this.match( new RegExp( REGEXP_FOR_BLOCK ) );

            block.removeClass( classData[0] );

            var blockLoopNumber = parseInt( classData[1] );
            var blockBeat = Number( classData[2] );

            if( blockLoopNumber == 0 )   return;

            $.each( fragments , function(){
                if( this.limit && ( this.limit.indexOf( blockLoopNumber ) < 0 ) )   return;
                if( this.omit && ( this.omit.indexOf( blockLoopNumber ) >= 0 ) )   return;

                chordFragments.push( { beat: blockBeat + this.beat , obj: this.obj } );
            });

        });

    });

    chordFragments = $.map( chordFragments , function( element ){

        var fragment = {};

        var tempo = null;
        for( var i = tempoTable.length - 1 ; i >= 0 ; i-- ){
            if( tempoTable[ i ].beat <= element.beat ){
                fragment.time = tempoTable[ i ].getTime( element.beat );
                break;
            }
        }

        fragment.object = element.obj;
        fragment.object.addClass( "t_" + fragment.time );

        return fragment;

    }).concat( rawTimes ).sort( function( a , b ){
        return ( a.time - b.time );
    });
    chordFragments.unshift( { time:0 , object:$() } );
    chordFragments.push( { time:Infinity , object:$() } );

    $.each( chordDisplay.find( "span.chordFragment" ) , function(){
        var fragment = $( this );
        var times = $.map( fragment.attr( "class" ).match( /t_\d+/g ) , function( element ){
            return element.replace( /^t_/ , "" ) + "ms";
        });
        fragment.attr( "title" , times.join( " / " ) );
    });

};

$(function(){

    //-- [Event] Chord Fragment
    var lastClicked = null;
    $( document ).on( "click" , "span.chordFragment" , function(){

        if( ! isChordEnable )   return;

        var fragmentTimes = $( this ).attr( "class" ).match( /t_(\d+)/g ).map( function( element ){
            return parseInt( element.replace( /t_/ , "" ) );
        }).sort( function( a , b ){ return ( a - b ) } );

        if( fragmentTimes.length <= 0 )   return;

        var targetTime = fragmentTimes[0];

        fragmentTimes = fragmentTimes.filter( function( element ){
            return element <= currentVideoTime;
        }).sort( function( a , b ){ return ( b-a ) } );;

        if( fragmentTimes.length > 0 )
            targetTime = fragmentTimes[0];

        youtubePlayer.seekTo( targetTime / 1000.0 , true );
        if( youtubePlayer.state != YT.PlayerState.PLAYING )
            youtubePlayer.playVideo();

        $( "#tbxSeekPosition" ).val( targetTime );
        $( "#lblSeekUnit" ).html( "ms" );
        $( "#btnSeek" ).focus();

        lastClicked = $( this );

    });

    var fixChordEditorHeight = function(){
        var targetHeight = Math.max( $( "#chordDisplay" ).height() - $( "#chordEditorButtons" ).height() , 200 );
        if( targetHeight > $( "#chordSource" ).height() )
            $( "#chordSource" ).animate( { height: targetHeight } , { duration: 400 , easing: "easeInOut" } );
    };

    //-- [Event] Chord Edit
    $( "#chordSource" ).css( "height" , "0px" );
    $( "#openChordEditor" ).click( function(){
        var editor = $( "#chordSource" );
        var display = $( "#chordDisplay" );

        $( "#chordHistory" ).hide();
        editor.show();
        $( "#openChordHistory" ).html( "Hisotry" );

        if( isChordEditting ){
            $( "#chordContent" ).width( "200%" );
            $( "#chordDisplay" ).width( "25%" );
            $( "#chordEditor" ).width( "calc( 25% - 16px )" );

            $( "#chordSource" ).animate( { height: "0" } , { duration: 400 , easing: "easeInOut" , complete: function(){
                $( "#chordDisplay" ).animate({ width: "50%" } , { duration: 300 , easing: "cubic" , complete: function(){
                    $( "#chordDisplay" ).width( "calc( 50% - " + $( "#historyDisplay" ).css( "width" ) + " )" );
                    $( "#historyDisplay" ).fadeIn( 200 );
                    isChordEditting = false;
                }});
            }});
        }
        else{
            isChordEditting = true;
            $( "input[name='playMode'][value='repeat']" ).next( "button" ).click();
            $( "#historyDisplay" ).fadeOut( 200 , function(){
                $( "#chordDisplay" ).width( "50%" );
                $( "#chordDisplay" ).animate({ width: "25%" } , { duration: 300 , easing: "cubicInv" , complete: function(){
                    $( "#chordContent" ).width( "100%" );
                    $( "#chordDisplay" ).width( "50%" );
                    $( "#chordEditor" ).width( "calc( 50% - 16px )" );
                    fixChordEditorHeight();
                } } );
            });
        }
    });

    //-- [Event] Chord Edit KeyUp
    var checkChordData = function( event ){

        var newData =  $( "#chordSource" ).val();

        parseChordData( newData , $( "#chordHistory" ).val() );

        if( isChordEditting )
            fixChordEditorHeight();

        if( newData == $( "#chordSourceBackup" ).val() )
            $( "#uploadChord" ).removeClass( "alertButton" );
        else
            $( "#uploadChord" ).addClass( "alertButton" );

    };

    $( "#chordSource" ).keyup( checkChordData );
    $( "#chordSource" ).change( checkChordData );

    //-- [Event] Reset Chord Edit
    $( "button#resetChordEdit" ).click( function(){
        $( "#chordSource" ).val( $( "#chordSourceBackup" ).val( ) ).change();
    });

    //-- [Event] Insert Template
    $( "button#insertTemplate" ).click( function(){

        var template = [];

        template.push( "[演奏順序] P,A,B,C,I,A,B,C,D,C,E" );
        template.push( "<tempo 120@0#1000/>" );
        template.push( "" );

        var beat = 4;

        var chords = [];
        for( var i = 0 ; i < 8 ; i ++ ){
            chords.push( "<frag b_" + ( beat * i ) + ">A</frag>" );
        }
        chords = "||" + chords.join( "|" ) + "||";

        var BLOCKS = [ "P:前奏 <block 1:0>" ,
                       "A:「****」 <block 1:32 2:160>" ,
                       "B:「****」 <block 1:64 2:192>" ,
                       "C:「****」 <block 1:96 2:224 3:288>" ,
                       "I:間奏 <block 1:128>" ,
                       "D:「****」 <block 1:256>" ,
                       "E:後奏 <block 1:320>" ];

        $.each( BLOCKS , function(){
            template.push( this );
            template.push( chords );
            template.push( "</block>");
            template.push( "");
        });

        $( "#chordSource" ).val( template.join( "\n" ) ).change();
    });

    //-- [event] Upload Button
    $( "button#uploadChord" ).click( function(){

        var ajaxParams = { mode: "set" , type: "chord" };
//        ajaxParams[ "playlist" ] = $( "#playlistSelector" ).val();
        ajaxParams[ "song" ] = $( "#songSelector" ).val();
        ajaxParams[ "chordData" ] = $( "#chordSource" ).val();
        ajaxParams[ "timestampChord" ] = $( "#chordTimeStamp" ).val();

        $.postJSON( AJAX_PLAYLIST_SCRIPT , ajaxParams , function( data ){

            if( data.result == "CONFLICT" ){
//                messageBox( "<span style='color:red;'>Conflict !!</span>" )
                alertError( ERROR_TITLE , "Timestamp Mismatch !!" );
                console.log( "Conflict" );
                return;
            }
            else if(  data.result != "OK" ){
                alertError( ERROR_TITLE , data.message );
                 return;
            }

            $( "#chordTimeStamp" ).val( data.timestampChord );
            $( "#chordSourceBackup" ).val( $( "#chordSource" ).val() );
            $( "#chordSource" ).change();
//            messageBox.show( "Saved." );

        });
    });

    //-- [event] Chord History Button
    $( "button#openChordHistory" ).click( function(){

        if( $( "#chordHistory" ).css( "display" ) == "none" ){
            $( "#chordHistory" ).height( $( "#chordSource" ).height() );
            $( "#chordSource" ).hide();
            $( "#chordHistory" ).show();
            $( "#openChordHistory" ).html( "Chord" );
        }else{
            $( "#chordHistory" ).hide();
            $( "#chordSource" ).show();
            $( "#openChordHistory" ).html( "Hisotry" );
        }

    });

});
