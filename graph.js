function defineBR_Graph($, Primer){
    var graph = function (id, width, height, settings){
        if(settings){
            this.settings = settings;
        } else {
            this.settings = {
                margin: 5,
                lineWidth: 5,
                colors: ['#00dddf', '#ff78e5', '#ffba00', '#444']
            }
        }
        this.lines = [];
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
            jQuery.each(this.lines, function(i, line){
                line.draw()
            });
            this.primer.draw();
        },
        initMouseListener: function (){
            wire_tap = new graph.listener();
            wire_tap.bind(this);
            this.primer.ghost = function(e){
                wire_tap.fire(e);
            }
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
                this.points[i].draw();
                this.line.lineTo(xy[0], xy[1]);
           };
           this.line.setLineWidth(this.lineWidth);
           this.line.setStrokeStyle(this.color);
           this.line.stroke();
        }
    };
    graph.series.point = function(x, y, series) {
        this.x = x;
        this.y = y;
        this.series = series;
        this.circle = new Primer.Layer();
        this.circle.setX(this.series.graph.settings.margin);
        this.circle.setY(this.series.graph.settings.margin);
        this.series.line.addChild(this.circle);
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
            this.circle.beginPath();
            this.circle.setFillStyle(this.series.color);
            var xy = this.series.graph.transform(this.x, this.y);
            this.circle.arc(xy[0], xy[1], 10, 0, Math.PI*2, false);
            this.circle.fill();
            this.circle.setVisible(false);
        },
        on: function(){
            this.circle.setVisible(true);
        },
        off: function(){
            this.circle.setVisible(false);
        }
    };
    graph.listener = function (){
    },
    graph.listener.prototype = {
        bind: function(parent){
            this.parent = parent;
            this.primer = parent.primer;
            this.tracker= null; 
            this.points = [];
            for (var i in this.parent.point_hash){
                this.points.push(parseInt(i));
            }
            this.points.sort();
        },
        column: function(x){
            x = parseInt(x);
            var delta = (this.parent.outer[0]-this.parent.inner[0]) / (this.points.length*4) >> 1; // dumb delta
            var low = 0;
            var high = this.points.length;
            var mid = parseInt(low + ((high - low) / 2));
            while(low < high) {
                mid = parseInt(low + ((high - low) / 2));
                if (this.points[mid] < x){
                    low = mid + 1;
                } else {
                    high = mid;
                }
            }
            //console.log(low < this.points.length, this.points[mid]+delta > x, this.points[mid]-delta < x);
            if ((low < this.points.length) && (this.points[mid]+delta > x && this.points[mid]-delta < x )) {
                return this.points[mid];
            }
            return -1;
        },
        fire: function(e) {
            var x_correct = this.parent.reverse(e.localX, 1)[0];
            var column = this.column(x_correct);
            if (column > 0 && this.tracker != column){
                if(this.tracker != null){
                    for ( var j=0; j<this.parent.point_hash[this.tracker].length; j++){
                        this.parent.point_hash[this.tracker][j].off();
                    }
                }

                for ( var i=0; i<this.parent.point_hash[column].length; i++){
                    this.parent.point_hash[column][i].on();
                }
                this.tracker = column;
            }
        }
    }
    return graph;
};

var Graph = defineBR_Graph($, Primer);
