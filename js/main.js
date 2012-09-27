$(document).ready(function(){
    var shelf_id = "3527"; // id for my selected papers (manually curated)
    /*
    var shelf_id = "1719"; // EnAKTing
    var shelf_id = "1292"; // mSpace
    var shelf_id = "1451"; // musicSpace
    var shelf_id = "1768"; // MusicNet
    */


    var source_uri = "http://eprints.soton.ac.uk/cgi/search/advanced/export_eps_JSON.js?screen=Public%3A%3AEPrintSearch&_action_export=1&output=JSON&exp=0%7C1%7Ccontributors_name%2F-date%2Ftitle%7Carchive%7C-%7Cshelves.shelfid%3Ashelves.shelfid%3AALL%3AEQ%3A"+shelf_id+"%7C-%7Ceprint_status%3Aeprint_status%3AALL%3AEQ%3Aarchive%7Cmetadata_visibility%3Ametadata_visibility%3AALL%3AEX%3Ashow&n="; // eprints.soton search URL

    var div = $("#eprints_carousel"); // DOM element to render the paper carousel
    var carousel = new EPCarousel(div, source_uri); // render the EPrints carousel now

});

