////// EFFING DATES

Date.prototype.format = function (){
    var names = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[this.getMonth()] + ' ' + (this.getDate());
};



////// GRAPH

function defineBR_Graph($, Primer){
    var graph = function (id, width, height, settings){
        if(settings){
            this.settings = settings;
        } else {
            this.settings = {
                margin: 5,
                DOMAIN: 'http://media.ceocampaigncontributions.info/js/br_graph/', 
                lineWidth: 4,
                circleRad: 7,
                circleInnerRad: 5,
                tip_offset: 20,
                y_label: 'stories',
                colors: ['#00dddf', '#ff78e5', '#ffba00', '#444444', '#00dddf', '#ff78e5', '#ffba00', '#444444', '#00dddf', '#ff78e5', '#ffba00', '#444444']
            };
        }
        this.lines = [];
        $('html head').append('<link rel="stylesheet" type="text/css" href="' + this.settings.DOMAIN + 'styles.css">');
        this.primer = new Primer(id, width, height);
        this.outer = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
        this.inner = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
        this.trans = [1,1];
        this.orig_width = width;
        this.orig_height = height;
        this.width = width-this.settings.margin*2;
        this.height = height-this.settings.margin*2;
        this.point_hash = {};
        this.init();
    };
    graph.prototype = {
        init: function () {
            this.setBounds(); 
        },
        mask: function(){
            var border = new Primer.Layer();
            border.beginPath();
            border.setStrokeStyle('#ffffff');
            border.setLineWidth(this.settings.margin*2);
            border.moveTo(0,0);
            border.lineTo(0,this.orig_height);
            border.lineTo(this.orig_width,this.orig_height);
            border.lineTo(this.orig_width,0);
            border.stroke();
            return border;
        },
        transform: function (x,y){
            /* returns x,y transformed to graph units */
            return [(x-this.inner[0])*this.trans[0], this.height-(y-this.inner[1])*this.trans[1]];
        },
        reverse: function(x,y){
            /* transforms x,y to orig units */
            return [x/this.trans[0]+ this.inner[0], (this.height-y)/this.trans[1]+this.inner[1]];
        },
        setData: function(raw_data){
            /* imports data from a page */
            var c = 0;
            for(var i in raw_data){
                this.lines.push(new graph.series(raw_data[i], this, this.settings.colors[c], i));
                if(c < this.settings.colors.length){
                    c++;
                }
            }
            this.setBounds();
            this.draw();
            this.initMouseListener();
        },
        setBounds: function(){
            for (var j=0; j < this.lines.length; j++){
                var max = this.lines[j].max();
                if (max[0] > this.outer[0]){
                    this.outer[0] = max[0];
                }
                if (max[1] > this.outer[1]){
                    this.outer[1] = max[1];
                }
                var min = this.lines[j].min();
                if (min[0] < this.inner[0]){
                    this.inner[0] = min[0];
                }
                if (min[1] < this.inner[1]){
                    this.inner[1] = min[1];
                }
            }
            this.trans[0] = this.width/(this.outer[0]-this.inner[0]);
            this.trans[1] = this.height/(this.outer[1]-this.inner[1]);
        },
        draw: function(){
            for(var i=0; i<this.lines.length; i++){
                this.lines[i].draw();
            }
            this.primer.addChild(this.mask());
            this.primer.draw(true);
        },
        initMouseListener: function (){
            wire_tap = new graph.listener();
            wire_tap.bind(this);
            this.primer.ghost = function(e){
                wire_tap.fire(e);
            };
        }
    };
    graph.series = function(data, graph, color, label) {
        this.graph = graph;
        this.lineWidth = graph.settings.lineWidth;
        this.color = color;
        this.label = label;
        var slug = label.toLowerCase().replace(/['"]/g, "").replace(/\s/g, "-"); 
        this.css_class = '.' + slug;
        this.css_class_bar = slug +'-bar';
        this.css_class_solid = slug +'-solid';
        this.points = [];
        this.line = new Primer.Layer();
        this.line.setX(graph.settings.margin);
        this.line.setY(graph.settings.margin);
        this.graph.primer.addChild(this.line);
        this.init(data);
    };
    graph.series.prototype = {
        init: function(data) {
            for (var i=0; i< data.length; i++){
                this.points.push(new graph.series.point(data[i].date, data[i].num_stats, this));
            }
            $(this.css_class).prepend('<div class="' + this.css_class_bar + '">&nbsp;</div>');
            $('.' + this.css_class_bar).css({'width': '1em', 
                                             'height': '.5em', 
                                             'background-color': this.color, 
                                             'float': 'left',
                                             'position': 'relative',
                                             'top': '6px',
                                             'margin-right': '.2em'
                                            });
            $('html head').append( '<style type="text/css"> .' + this.css_class_solid + '{ color: ' + this.color + '; font-weight:bold}</style>'); 
        },
        max: function() {
            var ret = [Number.NEGATIVE_INFINITY,Number.NEGATIVE_INFINITY];
            jQuery.each(this.points, function(i, point){
                if (point.x > ret[0]){
                    ret[0] = point.x;
                }
                if (point.y > ret[1]){
                    ret[1] = point.y;
                }
            });
            return ret;
        },
        min: function() {
            var ret = [Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY];
            jQuery.each(this.points, function(i, point){
                if (point.x < ret[0]){
                    ret[0] = point.x;
                }
                if (point.y < ret[1]){
                    ret[1] = point.y;
                }
            });
            return ret;
        },
        draw: function() {
           this.line.beginPath();
           var xy = this.graph.transform(this.points[0].x, this.points[0].y);
           this.line.moveTo(xy[0], xy[1]);
           for ( var i=0; i< this.points.length; i++) {
                xy = this.graph.transform(this.points[i].x, this.points[i].y);
                this.line.lineTo(xy[0], xy[1]);
           }
           this.line.setLineWidth(this.lineWidth);
           this.line.setStrokeStyle(this.color);
           this.line.stroke();
        }
    };
    graph.series.point = function(x, y, series) {
        this.x = x;
        this.y = y;
        this.series = series;
        if(this.series.graph.point_hash[x]){
            this.series.graph.point_hash[x].push(this);
        } else {
            this.series.graph.point_hash[x] = [this];
        }
        this.init();
    };
    graph.series.point.prototype = {
        init: function(){
        },
        draw: function() {
            this.circle = new Primer.Layer();
            this.circle.calls = [];
            this.circle.setX(this.series.graph.settings.margin);
            this.circle.setY(this.series.graph.settings.margin);
            this.circle.beginPath();
            this.circle.setFillStyle('#ffffff');
            var xy = this.series.graph.transform(this.x, this.y);
            this.circle.arc(xy[0], xy[1], this.series.graph.settings.circleRad, 0, Math.PI*2, false);
            this.circle.fill();

            this.circle.beginPath();
            this.circle.setFillStyle(this.series.color);
            this.circle.arc(xy[0], xy[1], this.series.graph.settings.circleInnerRad, 0, Math.PI*2, false); 
            this.circle.fill();
            this.series.graph.primer.addChild(this.circle);
        },
        on: function(){
            this.draw();
            this.circle.setVisible(true);
        },
        off: function(){
            this.circle.setVisible(false);
            this.series.graph.primer.removeChild(this.circle);
        }
    };
    graph.listener = function (){
    };
    graph.listener.prototype = {
        bind: function(parent){
            this.parent = parent;
            this.primer = parent.primer;
            this.tracker= null;
            this.tip = new graph.listener.tip();
            this.tip.bind(this);
            this.points = [];
            for (var i in this.parent.point_hash){
                this.points.push(parseInt(i));
            }
            this.points.sort();
        },
        column: function(x){
            x = parseInt(x);
            var segment = (this.parent.outer[0] - this.parent.inner[0]) / this.points.length; // how far on average points are away from one another
            var best_guess = parseInt((x-this.parent.inner[0])/segment);
            return this.points[best_guess];
        },
        fire: function(e) {
            var x_correct = this.parent.reverse(e.localX, 1)[0];
            var column = this.column(x_correct);
            if (column > 0 && this.tracker != column){
                if(this.tracker !== null){
                    for ( var j=0; j<this.parent.point_hash[this.tracker].length; j++){
                        this.parent.point_hash[this.tracker][j].off();
                    }
                }
                var y_max = 0;
                var x_max = 0;
                for ( var i=0; i<this.parent.point_hash[column].length; i++){
                    var curr = this.parent.point_hash[column][i];
                    curr.on();
                    if( y_max < curr.y){
                        y_max = curr.y;
                        x_max = curr.x;
                    }
                }
                this.tracker = column;
                this.tip.setContent(this.buildText(this.parent.point_hash[column], column),
                                    this.parent.transform(x_max, 1)[0], 
                                    this.parent.transform(1, y_max)[1]);
            }
        },
        buildText: function(column, d) {
            var text = '';
            var dobj = new Date(d);
            text += "<span class='x'>" + dobj.format() + '</span><br />';
            for( var i=0; i<column.length; i++){
                text += '<span class="' + column[i].series.css_class_solid  + '">'+ column[i].series.label + ": </span>" + column[i].y + ' ' + this.parent.settings.y_label + '<br />';
            }
            text += '';
            return text;
        }
    };
    graph.listener.tip = function () { 
        this.layer = new Primer.Layer();
        this.newX = 0;
        this.newY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.text = '';
    };
    graph.listener.tip.prototype = {
        bind: function (parent) {
           this.parent = parent;
           this.parent.primer.addChild(this.layer);
           this.container = this.parent.primer.container;
           this.hide();
        },
        setContent: function(text, x, y){
            this.newX = x;
            this.newY = y;
            this.show();
            this.layer.calls=[];
            this.text = text;
            this.layer.setTextAlign("center");
            this.layer.setFont("helvetica, verdana, sans-serif");
            this.layer.setFillStyle("#000000");
            this.layer.extFillText(this.text,this.layer.x,this.layer.y, null, 'tip');
        },
        show: function () { 
            if(!this.layer.getVisible()){
                this.currentX = this.newX;
                this.currentY = this.newY;
                var i = this;
                this.update(this.currentX, this.currentY);
                this.loop = setInterval(function () {
                        i.move();
                    }, 20);
                this.layer.setVisible(true);
                $(this.container + ' .tip').css({display: 'block'});
            }
        },
        hide: function (){
            if(this.layer.getVisible()){
                clearInterval(this.loop);
            }
            this.layer.setVisible(false);
            $(this.container + ' .tip').css({display: 'none'});
        }, 
        update: function (x, y){
            var obj = $(this.container + ' .tip'); 
            this.layer.x = x + this.parent.parent.settings.tip_offset;
            this.layer.y = y - obj.height();
            obj.css({top:this.layer.y, left: this.layer.x});
        },
        move: function () {
            this.currentX += (this.newX - this.currentX)*0.5;
            this.currentY += (this.newY - this.currentY)*0.1;
            if(this.newX != this.currentX && this.newY != this.currentY){
                this.update(this.currentX, this.currentY);
            }
        }
    };
    return graph;
}

var Graph = defineBR_Graph($, Primer);





