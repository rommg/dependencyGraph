/**
 * Created by guyr on 3/22/14.
 */
var graphData;
// get the data
var onSubmit = function(){
    var className = document.getElementById("className").value || '';
    var methodName = document.getElementById("methodName").value || '';
    $.get('http://localhost:4010/rest/dependencyGraph', {
        requestedClass: className,
        requestedMethod: methodName
    }, function(data){
        if (!data){
            return;
        }
        if (!data.graphNodes){
            alert("no dependencies");
        } else {
            graphData = data;
            createAndShowGraph();
        }
    })
}

var clearPreviousGraph = function(){
    var previousGraph = $('.svgContainer')[0];
    if (previousGraph){
        previousGraph.parentElement.removeChild(previousGraph);
    }
}

var createAndShowGraph = function(){
    var hideOptional = !(document.getElementById('optionalCheckBox').checked),
        experimentsData,
        nodes = {},
        links,
        linkToMaster = true;

    clearPreviousGraph();

    experimentsData = _.cloneDeep(graphData.graphNodes);

    if (linkToMaster){
        experimentsData['Master'] = createMasterExpObj();
    }

    //create graph nodes
    _.forEach(experimentsData, function(node){
        nodes[node.name] = {
            name: node.name,
            owner: node.owner
        }
    });

    // create links data
    var experimentNames = _.map(experimentsData, function(expData,expName){
        return expName;
    })
    var links = createGraphLinks(experimentsData, experimentNames);

    // filter optional links if needed
    if (hideOptional){
        links = _.filter(links, function(link){
            return link.dependencyType.indexOf('optional') === -1;
        })
    }
    // update links to point to the actual nodes members - must for D3
    links.forEach(function(link) {
            link.source = nodes[link.source];
            link.target = nodes[link.target];
    });

    var width = 960,
        height = 650;

    // when master is off, change charge to -1500 and maybe smaller distance
    // default is distance 100 and force -1800
    var force = d3.layout.force()
        .nodes(d3.values(nodes))
        .links(links)
        .size([width, height])
        .linkDistance(100)
        .charge(-1800)
        .on("tick", tick)
        .start();
    var svg = d3.select("#graphContainer").append("svg")
        .attr("class", "svgContainer");


    links.forEach(function(link) {
        if (link.dependencyType.toLowerCase() === 'optional-before') {
            link.type = "optBefore";
        } else if (link.dependencyType.toLowerCase() === 'required-before') {
            link.type = "reqBefore";
        } else if (link.dependencyType.toLowerCase() === 'optional-after') {
            link.type = "optAfter";
        } else if (link.dependencyType.toLowerCase() === 'required-after') {
            link.type = "reqAfter";
        }
    });

// build the arrow.
    svg.append("svg:defs").selectAll("marker")
        .data(["end"]) // Different link/path types can be defined here
        .enter().append("svg:marker") // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", -2.5)
        .attr("markerWidth", 9)
        .attr("markerHeight", 9)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

// add the links and the arrows
    var path = svg.append("svg:g").selectAll("path")
        .data(force.links())
        .enter().append("svg:path")
        .attr("class", function(d) { return "link " + d.type; })
        .attr("marker-end", "url(#end)");

// define the nodes
    var node = svg.selectAll(".node")
        .data(force.nodes())
        .enter().append("g")
        .attr("class", "node")
        .call(force.drag);
// add the nodes
    node.append("circle")
        .attr("r", 10);

// add the experiment name
    node.append("text")
        .attr("x", 15)
        .attr("dy", ".35em")
        .text(function(d) { return d.name; });

// add the experiment owner name
    node.append("text")
        .attr("x", 15)
        .attr("dy", "25px")
        .attr("class", "ownerText")
        .text(function(d) { return 'Owner: ' + (d.owner ? d.owner : 'Stalin');});

// add the curvy lines
    function tick() {
        path.attr("d", function(d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M" +
                (d.source.x+5) + "," +
                (d.source.y+0.5) + "A" +
                dr + "," + dr + " 0 0,1 " +
                (d.target.x+5) + "," +
                (d.target.y+0.5);
        });
        node
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")"; });
    }
}

/**
 * Create links between 2 experiments that have a mutual dependency
 * for experiments without constraints,
 * or all of their constraints are not relevant to the requested class - a link is created to Master.
 * @param graphNodes
 * @param experiments
 * @returns {Array}
 */
var createGraphLinks = function (graphNodes, experiments) {
    var isInMaster = _.contains(experiments, 'Master'),
        dependencies,
        links = [],
        hasRelevantDependency;
    _.each(graphNodes, function (experimentData) {
        hasRelevantDependency = false;
        dependencies = experimentData.dependencies;
        if (dependencies) {
            _.each(dependencies, function (dependencyType, dependencyName) {
                if (_.contains(experiments, dependencyName)) {
                    hasRelevantDependency = true;
                    links.push({
                        source: experimentData.name,
                        sourceOwner: experimentData.owner,
                        target: dependencyName,
                        dependencyType: dependencyType
                    });
                }
            });
        }
        if (!hasRelevantDependency && isInMaster && graphNodes['Master']) {
            links.push({
                source: experimentData.name,
                sourceOwner: experimentData.owner,
                target: 'Master',
                dependencyType: 'required-before'
            });
        }
    });
    return links;
};

var createMasterExpObj = function(){
    return {
        name: 'Master',
        owner: 'Stalin',
        dependencies: {}
    }
};

