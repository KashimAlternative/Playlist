<?php

# Start Time
$timeStart = microtime(true);

# Create JSON Data for Reply
$jsonData = array();

# Open SQL Client
require( '/home/kashim/lib/mysql.php' );

# Set Character Code
if( ! $sqlClient->query( 'set character set utf8mb4' ) ){
    $jsonData[ 'message' ] = 'SQL Error';
    $jsonData[ 'result' ] = 'FATAL';
    exit(0);
}

# Get Post Data
$mode = $_POST[ 'mode' ];
$type = $_POST[ 'type' ];
$jsonData[ 'query' ] = array( 'mode' => $mode , 'type' => $type );

# Switch by Mode
switch( $mode ){
case 'get': // Get Data --------------------------------

    # Switch by Type
    switch( $type ){
    case 'playlists': // Playlists ----------------

        $sqlCommand = 'select id,title from kashim_playlist.playlists';
        $sqlCommand .= ' where isPublic = 1';

        if ( ! ( $sqlResult = $sqlClient->query( $sqlCommand ) ) ){
            $jsonData[ 'message' ] = 'SQL Query Error';
            $jsonData[ 'result' ] = 'ERROR';
            break;
        }

        $playlists = array();

        while ( $item = $sqlResult->fetch_assoc() )
            array_push( $playlists , $item );

        $sqlResult->close();

        $jsonData[ 'playlists' ] = $playlists;

        $jsonData[ 'result' ] = 'OK';

        break;

    case 'songs': // Songs ----------------

        $idPlaylist = $_POST[ 'playlist' ];

        $jsonData[ 'query' ][ 'playlist' ] = $idPlaylist;

        $sqlCommand = 'select id,title,videoId from kashim_playlist.songs where playlist like \'%'.$idPlaylist.'%\' and errorCount < 10';
        if ( ! ( $sqlResult = $sqlClient->query( $sqlCommand ) ) ){
            $jsonData[ 'message' ] = 'SQL Query Error';
            $jsonData[ 'result' ] = 'ERROR';
            break;
        }

        $songs = array();
        while ( $item = $sqlResult->fetch_assoc() )
            array_push( $songs , $item );
            
        $sqlResult->close();

        $jsonData[ 'songs' ] = $songs;

        $jsonData[ 'result' ] = 'OK';

        break;

    case 'songData': // Song Data ----------------

        $idSong = $_POST[ 'song' ];

        $jsonData[ 'query' ][ 'song' ] = $idSong;

        $sqlCommand = 'select * from kashim_playlist.songs where id = \''.$idSong.'\'';
        if ( ! ( $sqlResult = $sqlClient->query( $sqlCommand ) ) ){
            $jsonData[ 'message' ] = 'SQL Query Error';
            $jsonData[ 'result' ] = 'ERROR';
            break;
        }
        
        $jsonData[ 'songData' ] = $sqlResult->fetch_assoc();
        $sqlResult->close();
        if( ! isset( $jsonData[ 'songData' ] ) ){
            $jsonData[ 'message' ] = 'Invalid Request';
            $jsonData[ 'result' ] = 'INVALID';
            break;
        }

        $jsonData[ 'songData' ][ 'variations' ] = json_decode( $jsonData[ 'songData' ][ 'variations' ] , true );
        unset( $jsonData[ 'songData' ][ 'status' ] );
        unset( $jsonData[ 'songData' ][ 'playlist' ] );

        $jsonData[ 'result' ] = 'OK';

        break;

    default: // Undefined Type ----------------
        $jsonData[ 'message' ] = 'Invalid Type';
        $jsonData[ 'result' ] = 'INVALID';
        break;
    }

    break;

case 'set': // Set Data --------------------------------
    switch( $type ){
    case 'chord': // Chord ----------------

        $idSong = $_POST[ 'song' ];
        $chordData = $_POST[ 'chordData' ];
        $chordHistory = $_POST[ 'chordHistory' ];
        $timestampQuery = $_POST[ 'timestampChord' ];

        $sqlCommand = 'select timestampChord from kashim_playlist.songs where id = \''.$idSong.'\'';
        if ( ! ( $sqlResult = $sqlClient->query( $sqlCommand ) ) ){
            $jsonData[ 'message' ] = 'SQL Query Error';
            $jsonData[ 'result' ] = 'ERROR';
            break;
        }

        $sqlRecord = $sqlResult->fetch_assoc();
        $sqlResult->close();
        if( ! isset( $sqlRecord ) ){
            $jsonData[ 'message' ] = 'Invalid Request';
            $jsonData[ 'result' ] = 'INVALID';
            break;
        }

        if( $sqlRecord[ 'timestampChord' ] !== $timestampQuery ){
            $jsonData[ 'message' ] = 'Edit Conflict';
            $jsonData[ 'result' ] = 'CONFLICT';
            break;
        }

        $timestampNew = ( new DateTime() )->format( 'Y-m-d H:i:s' );

        $sqlCommand = 'update kashim_playlist.songs set chordData = \''.$sqlClient->real_escape_string( $chordData ).'\',chordHistory = \''.$sqlClient->real_escape_string( $chordHistory ).'\',timestampChord = timestamp \''.$timestampNew.'\' where id = \''.$idSong.'\'';
        if ( ! $sqlClient->query( $sqlCommand ) ){
            $jsonData[ 'message' ] = 'SQL Query Error';
            $jsonData[ 'result' ] = 'ERROR';
            break;
        }

        $jsonData[ 'timestampChord' ] = $timestampNew;
        $jsonData[ 'result' ] = 'OK';

        break;

    case 'songData': // Song Data ----------------

        $idSong = $_POST[ 'song' ];
        $songData = json_decode( $_POST[ 'songData' ] , true );
        $timestampQuery = $_POST[ 'timestamp' ];

        $sqlCommand = 'select timestamp from kashim_playlist.songs where id = \''.$idSong.'\'';
        if ( ! ( $sqlResult = $sqlClient->query( $sqlCommand ) ) ){
            $jsonData[ 'message' ] = 'SQL Query Error';
            $jsonData[ 'result' ] = 'ERROR';
            break;
        }

        $sqlRecord = $sqlResult->fetch_assoc();
        $sqlResult->close();
        if( ! isset( $sqlRecord ) ){
            $jsonData[ 'message' ] = 'Invalid Request';
            $jsonData[ 'result' ] = 'INVALID';
            break;
        }

        if( $timestampQuery !== $sqlRecord[ 'timestamp' ] ){
            $jsonData[ 'message' ] = 'Edit Conflict';
            $jsonData[ 'result' ] = 'CONFLICT';
            break;
        }

        $timestampNew = ( new DateTime() )->format( 'Y-m-d H:i:s' );
        $songData[ 'timestamp' ] = $timestampNew;

        $dataArray = array();
        foreach( $songData as $key => $value ){
            switch( $key ){
            case 'timestamp':
                $dataArray[ $key ] = $key.'=timestamp(\''.$value.'\')';
                break;
            case 'status':
            case 'errorCount':
                // Use SQL Default
                break;
            case 'chordData':
            case 'chordHistory':
            case 'timestampChord':
                // Except Chord Data
                break;
            default:
                if( preg_match( '/\S/' , $value ) > 0 )
                    $dataArray[ $key ] = $key.'=\''.$sqlClient->real_escape_string( $value ).'\'' ;
                break;
            }
        }

        if( isset( $dataArray[ 'videoId' ] ) )
            $dataArray[ 'errorCount' ] = 'errorCount=0';

        $sqlCommand = 'update kashim_playlist.songs set '.join( ',' , $dataArray ).' where id=\''.$idSong.'\'';
        if ( ! $sqlClient->query( $sqlCommand ) ){
            $jsonData[ 'message' ] = 'SQL Query Error';
            $jsonData[ 'result' ] = 'ERROR';
            break;
        }

        $jsonData[ 'songData' ] = $songData;
        $jsonData[ 'result' ] = 'OK';

        break;

    default: // Undefined Type ----------------
        $jsonData[ 'message' ] = 'Invalid Type';
        $jsonData[ 'result' ] = 'INVALID';
        break;
    }
    break;

case 'add': // Add Item --------------------------------

    if( ! $isAdmin ){
        $jsonData[ 'message' ] = 'Invalid Authority';
        $jsonData[ 'result' ] = 'INVALID';
        break;
    }
    
    switch( $type ){
    case 'song': // New Song ----------------

        $songData = json_decode( $_POST[ 'songData' ] , true );

        $keys = array_keys( $songData );
        $values = array();
        foreach( $keys as &$key ){
            array_push( $values , '\''.$sqlClient->real_escape_string( $songData[ $key ] ).'\'' );
        }

        $sqlCommand = 'insert into kashim_playlist.songs ('.join( ',' , $keys ).') values ('.join( ',' , $values ).')';
        if ( ! $sqlClient->query( $sqlCommand ) ){
            $jsonData[ 'message' ] = 'SQL Query Error';
            $jsonData[ 'result' ] = 'ERROR';
            break;
        }

        $jsonData[ 'result' ] = 'OK';

        break;

    default: // Undefined Type ----------------
        $jsonData[ 'message' ] = 'Invalid Type';
        $jsonData[ 'result' ] = 'INVALID';
        break;

    }
    break;

case 'log': // Log --------------------------------

    # Switch by Type
    switch( $type ){
    case 'error': // Error ----------------
    case 'noerror': // No Error ----------------

        $song = $_POST[ 'song' ];
        if( $type == 'error' ){
            $errorCode = $_POST[ 'errorCode' ];
            if( $errorCode < 100 )   break;
        }
        
        $sqlCommand = 'select errorCount from kashim_playlist.songs where id = \''.$song.'\'';
        if ( ! ( $sqlResult = $sqlClient->query( $sqlCommand ) ) ){
            $jsonData[ 'message' ] = 'SQL Query Error';
            $jsonData[ 'result' ] = 'ERROR';
            break;
        }

        $songData = $sqlResult->fetch_assoc();
        $sqlResult->close();

        if( $type == 'error' )
            $errorCount = $songData[ 'errorCount' ] + 1;
        else
            $errorCount = 0;
        
        $sqlCommand = 'update kashim_playlist.songs set errorCount = '.$errorCount.' where id = \''.$song.'\'';
        if( ! ( $sqlClient->query( $sqlCommand ) ) ){
            $jsonData[ 'message' ] = 'SQL Query Error';
            $jsonData[ 'result' ] = 'ERROR';
            break;
        }

        $jsonData[ 'result' ] = 'OK';

        break;

    default: // Undefined Type ----------------
        $jsonData[ 'message' ] = 'Invalid Type';
        $jsonData[ 'result' ] = 'INVALID';
        break;
    }

    break;

/*
case 'env': // Environment (Debug) --------------------------------
    phpinfo();
    break;
*/

default: // Undefined Mode --------------------------------
    $jsonData[ 'message' ] = 'Invalid Mode';
    $jsonData[ 'result' ] = 'INVALID';
    break;

}

# End Time
$timeEnd = microtime(true);

# Execute Time of This Script
$jsonData[ 'execTime' ] = $timeEnd - $timeStart;

# Reply
header( 'Access-Control-Allow-Origin: http://kashim.sakura.ne.jp' );
header( 'Content-Type: application/json; charset=UTF-8' );
echo( json_encode( $jsonData ) );

#----------------------------------------------------------------
# Log
$postData = array();
foreach( $_POST as $key => $value )
    array_push( $postData , $key.'='.$value );

$sqlCommand = 'insert into kashim_playlist.accessLog (execMicrosecond,ipAddress,data) values ('.floor( $jsonData[ 'execTime' ] * 1000000 ).',\''.$_SERVER[ 'REMOTE_ADDR' ].'\',\''.$sqlClient->real_escape_string( join( ',', $postData ) ).'\')';
$sqlClient->query( $sqlCommand );

?>
