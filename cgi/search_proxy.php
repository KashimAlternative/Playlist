<?php

$keyword = $_GET[ 'word' ];

$uri = 'https://clients1.google.com/complete/search?client=youtube&hl=ja&gl=jp&callback=a&cp=2&q='.$keyword;

$context = stream_context_create(
    array(
        'http' => array(
            'method' => 'GET',
            'header' => 'User-Agent:'.$_SERVER[ 'HTTP_USER_AGENT' ]
        )
    )
);

$result = file_get_contents( $uri , false , $context );

//$result = peg_replace( '/^window\.google\.ac\.h\(/' , '' , $result );
//$result = preg_replace( '/\)$/' , '' , $result );
//preg_match( '/^a && a\((.*)\)$/' , $result , $matched );

header( 'Access-Control-Allow-Origin: http://kashim.sakura.ne.jp' );
header( 'Content-Type: application/json; charset=UTF-8' );

//print_r( $http_response_header );
echo( $result );
//echo( $matched[1] );

?>
