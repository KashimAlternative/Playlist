jQuery.prototype.openModal = function( duration ){
    if( !this.hasClass( "modal" ) )   return;

    var overlay = $( "#modalOverlay" );

    this.css( {
        "left"    : ( "calc( 50% - " + ( this.width() / 2 ) + "px )" ),
        "top"     : ( "calc( 50% - " + ( this.height() / 2 ) + "px )" ),
    });

    if( duration ){
        overlay.fadeIn( duration );
        this.fadeIn( duration );
    }
    else{
        overlay.show();
        this.show();
    }

    var modal = this;
    overlay.click( function( event ){
        modal.closeModal();
        event.stopPropagation();
    });

};

jQuery.prototype.closeModal = function( duration ){
    if( !this.hasClass( "modal" ) )   return;

    var overlay = $( "#modalOverlay" );

    if( duration ){
        overlay.fadeOut( duration );
        this.fadeOut( duration );
    }
    else{
        overlay.hide();
        this.hide();
    }
};

jQuery.prototype.modal = function( config ){

    var modal = this;

    var style = {
        "display" : "none",
        "position": "fixed",
        "left"    : ( "calc( 50% - " + ( this.width() / 2 ) + "px )" ),
        "top"     : ( "calc( 50% - " + ( this.height() / 2 ) + "px )" ),
        "z-index" : "5"
    };
    this.css( style ).addClass( "modal" );

    if( ! ( $( "#modalOverlay" )[0] ) ){
        var overlay = $( "<div id='modalOverlay'></div>" );
        var overlayStyle = {
            "display": "none",
            "position": "fixed",
            "top": "0",
            "left": "0",
            "width": "100%",
            "height": "120%",
            "z-index": "4",
            "background": ( config.overlay || "rgba( 0 , 0 , 0 , 0.75 )" )
        };
        overlay.css( overlayStyle );
        $( "body" ).append( overlay );
    }

    if( config.open )
        $( config.open ).click( function(){modal.openModal( config.duration );});

    if( config.close )
        $( config.close ).click( function(){modal.closeModal( config.duration );});

};
