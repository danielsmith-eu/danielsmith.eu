var EPCarousel = function(div, source_uri){
    var carousel = this;

    carousel.source_uri = source_uri;
    carousel.div = div;

    carousel.lastyear = null;

    carousel.slide_delay = 2000; // time between slides in ms
    carousel.slide_time = 200; // time to slide in ms

    carousel.ignore_scrolling = false;
    carousel.ignore_one = false;
    carousel.paused = false;
    carousel.load_data();
};

EPCarousel.prototype = {
    set_default_html: function(){
        var carousel = this;

        carousel.div.html(
            "<div class='epc_papers_container span8'><div class='epc_papers'></div></div>"+
            "<div class='epc_titlelist span4'></div>"+
            ""
        );
        carousel.papersdiv = carousel.div.find(".epc_papers");
        carousel.titlesdiv = carousel.div.find(".epc_titlelist");

        // when the titles list is scrolled (by a human) then pause the carousel
        carousel.titlesdiv.scroll(function(evt){
            if (!carousel.ignore_scrolling){
                if (carousel.ignore_one){
                    carousel.ignore_one = false; // one scrolling event is triggered AFTER the complete function in animate() is called, so we ignore a single trigger (bug in jQuery?)
                } else {
                    carousel.pause();
                }
            }
        });
    },
    load_data: function(){
        var carousel = this;
        carousel.current_paper = null;
        // loads data from this.source_uri JSONP into object
        carousel.papers = [];
        $.ajax({
            url: this.source_uri,
            dataType: "jsonp",
            success: function(data){
                var papers = data; // papers is from EPrints

                carousel.set_default_html(); // clear existing div

                papers = carousel.order(papers, "date"); // order by date
                papers.reverse(); // most recent first

                var firstpaper = true;
                $.each(papers, function(){
                    var paper = this;
                    var abstract = "";
                    if (paper['abstract'] != null){
                        abstract = "<div class='epc_abstract'>"+paper['abstract']+"</div>";
                    }
                    var event = "";
                    if (paper['event_title'] != null){
                        event = "<div class='epc_event'>In: "+paper['event_title']+"</div>";
                    }


                    var displaynone = " style='display: none;'";


                    var pdflink = null;

		    if ("documents" in paper){
                        $.each(paper['documents'], function(){
			    var doc = this;
			    if (pdflink == null){
				if ("format" in doc && doc['format'] == "application/pdf"){
				    pdflink = doc['uri'];
				}
			    }
			});
		    }


                    var html = "<div"+(firstpaper?"":displaynone)+" class='epc_paper'>"+
                                 (pdflink == null?'':
                                    "<div class='epc_pdf'><a target='_blank' href='"+pdflink+"'><img src='img/application_pdf.png'></a></div>"
                                 )+
                                 "<div class='epc_title'>"+paper['title']+"</div>"+
                                 "<div class='epc_authors'>"+
                                   carousel.render_authors(paper['creators'])+
                                  "</div>"+
                                  event+
                                  abstract+
                                "</div>";
                    var link = paper['uri'];
                    paper['div'] = $(html);
                    carousel.add_paper(html,paper,link);
                    carousel.papers.push(paper);
                    firstpaper = false;

                    // set the previous paper's next_paper to this paper
                    if (carousel.papers.length > 1){
                        var prev_paper_id = carousel.papers.length - 2;
                        carousel.papers[prev_paper_id].next_paper = paper;
                    }
                    paper['next_paper'] = carousel.papers[0];

                    if (carousel.current_paper == null){
                        carousel.current_paper = paper;
                    }
                });
                carousel.start_carousel();
            }
        });
    },
    add_paper: function(html, paper, link){
        var carousel = this;

        // add a paper to the carousel div, given this HTML string and link
        paper['div'].click(function(){
            window.open(link);
        });
        carousel.papersdiv.append(paper['div']);

        var year = carousel.year_from_date(paper['date']);
        if (carousel.lastyear == null || year != carousel.lastyear){
            carousel.titlesdiv.append("<div class='epc_titleyear'>"+year+"</div>");
            carousel.lastyear = year;
        }
        var event = "";
        if (paper['event_title'] != null){
            event = "<div class='epc_papertitle_event'>("+paper['event_title']+")</div>";
        }

        paper['titlediv'] = $("<div class='epc_papertitle'><div class='epc_papertitle_title'>"+paper['title']+"</div><div class='epc_papertitle_authors'>"+carousel.render_authors(paper['creators'])+"</div>"+event+"</div>");
        paper['titlediv'].click(function(){
            carousel.force_paper(paper);
        });
        if (carousel.papers.length == 0){
            paper['titlediv'].addClass("epc_bgsel");
        }
        carousel.titlesdiv.append(paper['titlediv']);
    },
    render_authors: function(author_arr){
        // render authors as a comma-separated list, from the EP3 data format
        var rendered = "";
        $.each(author_arr, function(){
            var name = "";
            if (this['name']['honourific'] != null){
                name += this['name']['honourific'];
            }
            if (this['name']['given'] != null){
                if (name != ""){ name += " " };
                name += this['name']['given'];
            }
            if (this['name']['family'] != null){
                if (name != ""){ name += " " };
                name += this['name']['family'];
            }
            if (rendered != ""){
                rendered += ", ";
            }
            rendered += name;
        });
        return rendered;
    },
    order: function(data, field){
        // order an array of objects by this field

        var uniq_fields = {};
        $.each(data, function(){
            var field_val = this[field];
            uniq_fields[field_val] = true;
        });
        var uniq_fields_arr = [];
        for(var field_val in uniq_fields){
            uniq_fields_arr.push(field_val);
        }
        uniq_fields_arr.sort();

        var ordered = [];
        $.each(uniq_fields_arr, function(){
            var field_val = this;
            $.each(data, function(){
                if (this[field] == field_val){
                    ordered.push(this);
                }
            });
        });

        return ordered;
    },
    run_carousel: function(){
        // runs carousel in this.div
        var carousel = this;

        var nextup = carousel.current_paper.next_paper;
        carousel.show_paper(nextup);
    },
    show_paper: function(paper){
        var carousel = this;

        var current_paper = carousel.current_paper
        setTimeout(function(){
            carousel.slide_paper_out(current_paper);
        }, 0);
        setTimeout(function(){
            carousel.slide_paper_in(paper);
        }, 0);

        var titlelist = $(carousel.div.find(".epc_titlelist"));
        var toppx = paper['titlediv'].position().top;

        var scrollTop = titlelist.scrollTop();
        var newScrollTop = toppx + titlelist.scrollTop() - (titlelist.height()/2) + (paper['titlediv'].height()/2);

        carousel.scroll(titlelist, scrollTop, newScrollTop); 

        carousel.current_paper = paper;

        carousel.timeout = setTimeout(function(){
            carousel.start_carousel();
        }, carousel.slide_time); // wait until the slide has finished before starting the next slide delay
    },
    scroll: function(div, origScrollTop, endScrollTop){
        var carousel = this;

        carousel.ignore_scrolling = true;
        div.animate({
            scrollTop: endScrollTop,
        }, {
            duration: carousel.slide_time,
            easing: "swing",
            complete: function(){
                carousel.ignore_scrolling = false;
                carousel.ignore_one = true;
            },
        });
    },
    pause: function(){
        var carousel = this;
        clearTimeout(carousel.timeout); // cancel the next slide that has been planned
        carousel.paused = true;
    },
    force_paper: function(paper){
        var carousel = this;

        if (paper == carousel.current_paper){
            return; // they clicked the same paper
        }

        carousel.pause();

        carousel.show_paper(paper);
    },
    start_carousel: function(){
        // run the carousel after some time
        var carousel = this;

        if (!carousel.paused){
            carousel.timeout = setTimeout(function(){
                carousel.run_carousel();
            }, carousel.slide_delay);
        }
    },
    slide_paper_out: function(paper){
        var carousel = this;

        var container_width = this.papersdiv.width();
        paper['titlediv'].removeClass("epc_bgsel");

        paper['div'].animate({
            "left": 0 - container_width,
        }, carousel.slide_time, "swing", function(){
            paper['div'].hide();
            paper['div'].css("left", 0);
        });
    },
    slide_paper_in: function(paper){
        var carousel = this;

        var container_width = this.papersdiv.width();
        paper['titlediv'].addClass("epc_bgsel");

        // move title to the right and then show it
        paper['div'].css("left", container_width);
        paper['div'].show();

        paper['div'].animate({
            "left": 0,
        }, carousel.slide_time, "swing", function(){
            // nothing
        });
    },
    year_from_date: function(isodate){
        if (isodate.length >= 4){
            return isodate.substr(0,4);
        }
        return null;

    }
};


