import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Specify the chart’s dimensions.
const width = 875;
const height = width;

// Fetching the data
var newData = await d3.csv("data.csv");

// Conditional parsing of data
for (var i = 0; i < newData.length; i++) {
  newData[i].name = newData[i].target;
  newData[i].value = isNaN(newData[i].revenue) ? 1 : newData[i].revenue;
  if (newData[i].value < 5) {
    newData[i].value = 5;
  }
}

// Create the color scale.
const color = d3.scaleLinear()
  .domain([0, 4])
  .range(["hsl(250,95%,95%)", "hsl(278,93%,44%)"])
  .interpolate(d3.interpolateHcl);

//Define global vars
var focus;
var filteredData = newData;

// Create the tooltip div
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("background-color", "white")
  .style("border", "1px solid #ccc")
  .style("padding", "10px")
  .style("border-radius", "4px")
  .style("box-shadow", "0 0 5px rgba(0,0,0,0.3)");

createHistogram(filteredData, "year");

function collapseTreeHelper(focus, arr) {
  if (focus.hasOwnProperty("children") == false) {
    arr.push(focus.data);
    return;
  }

  for (var i = 0; i < focus.children.length; i++) {
    collapseTreeHelper(focus.children[i], arr);
  }

  return arr;
}

function collapseTree(focus) {
  return collapseTreeHelper(focus, []);
}

function createCircleChart(groupings) {
  groupingDepth = groupings.length;

  var newDataGrouped;

  //group depending on groupingDepth and groupingList
  if (groupingDepth == 1) {
    newDataGrouped = d3.group(newData, d => d[groupings[0]]);
  } else if (groupingDepth == 2) {
    newDataGrouped = d3.group(newData, d => d[groupings[0]], d => d[groupings[1]]);
  } else if (groupingDepth == 3) {
    newDataGrouped = d3.group(newData, d => d[groupings[0]], d => d[groupings[1]], d => d[groupings[2]]);
  } else if (groupingDepth == 4) {
    newDataGrouped = d3.group(newData, d => d[groupings[0]], d => d[groupings[1]], d => d[groupings[2]], d => d[groupings[3]]);
  }

  // Formatting the data for the chart
  var fixedData = {name : "data", children: []};

  if (groupingDepth == 4) {
    for (var [key, value] of newDataGrouped.entries()) {
      var correctedValue = [];
      for (var [key2, value2] of value.entries()) {
        var correctedValue2 = [];
        for (var [key3, value3] of value2.entries()) {
          var correctedValue3 = [];
          for (var [key4, value4] of value3.entries()) {
            correctedValue3.push({name: key4, children: value4});
          }
          correctedValue2.push({name: key3, children: correctedValue3});
        }
        correctedValue.push({name: key2, children: correctedValue2});
      }
      fixedData.children.push({name: key, children: correctedValue});
    }
  } else if (groupingDepth == 3) {
    for (var [key, value] of newDataGrouped.entries()) {
      var correctedValue = [];
      for (var [key2, value2] of value.entries()) {
        var correctedValue2 = [];
        for (var [key3, value3] of value2.entries()) {
          correctedValue2.push({name: key3, children: value3});
        }
        correctedValue.push({name: key2, children: correctedValue2});
      }
      fixedData.children.push({name: key, children: correctedValue});
    }
  } else if (groupingDepth == 2) {
    for (var [key, value] of newDataGrouped.entries()) {
      var correctedValue = [];
      for (var [key2, value2] of value.entries()) {
        correctedValue.push({name: key2, children: value2});
      }
      fixedData.children.push({name: key, children: correctedValue});
    }
  } else if (groupingDepth == 1) {
    for (var [key, value] of newDataGrouped.entries()) {
      fixedData.children.push({name: key, children: value});
    }
  }

  var data = fixedData;

  // Create the SVG container.
  const svg = d3.create("svg")
  .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
  .attr("width", width)
  .attr("height", height)
  .attr("style", `max-width: 100%; height: auto; display: block; margin: 0 -14px; background: ${color(0)}; cursor: pointer;`);

  // Compute the layout.
  const pack = data => d3.pack()
    .size([width, height])
    .padding(3)
  (d3.hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value));
  const root = pack(data);

  // Append the nodes.
  const node = svg.append("g")
    .selectAll("circle")
    .data(root.descendants().slice(1))
    .join("circle")
    .attr("fill", function(d) {
      if (d.children) {
        return color(d.depth);
      } else if (d.data.ransom_paid == "ransom paid") {
        return "#FFB000"
      } else if (d.data.ransom_paid == "refused") {
        return "#e25097"
      } else {
        return "#d9d9d9"
      }
    })
    .attr("pointer-events", d => !d.children ? null : null)
     .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#000");
        if (d.children) {
          return;
        }
        tooltip.style("visibility", "visible")
          .html(`Name: ${d.data.name}<br>Revenue: ${isNaN(d.data.revenue) ? "Unknown" : "$" + d.data.revenue + "M USD"}<br>Story: ${d.data.interesting_story == "" ? "Unknown" : d.data.interesting_story}`);
    })
    .on("mousemove", function (event) {
      tooltip.style("top", (event.pageY + 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", null);
      tooltip.style("visibility", "hidden");
    })
    .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));


  // Append the text labels.
  const label = svg.append("g")
    .style("font", "12px sans-serif")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants().filter(d => d.value >= 140))
    .join("text")
    .style("fill-opacity", d => d.parent === root ? 1 : 0)
    .style("display", d => d.parent === root ? "inline" : "none")
    .text(d => d.data.name);

  // Create the zoom behavior and zoom immediately in to the initial focus node.
  svg.on("click", (event) => zoom(event, root));
  focus = root;
  let view;
  zoomTo([focus.x, focus.y, focus.r * 2]);

  function zoomTo(v) {
    const k = width / v[2];

    view = v;

    label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("r", d => d.r * k);
  }

  function zoom(event, d) {

    if (!d.children) {return; }

    const focus0 = focus;

    focus = d;

    const transition = svg.transition()
        .duration(event.altKey ? 7500 : 750)
        .tween("zoom", d => {
          const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
          return t => zoomTo(i(t));
        });

    label
      .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
      .transition(transition)
        .style("fill-opacity", d => d.parent === focus ? 1 : 0)
        .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
        .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });

    filteredData = collapseTree(focus);
    createHistogram(filteredData, containerTypesMap[selectedOption4]);
    createPieChart(filteredData);
  }

  circles.innerHTML = "";
  circles.append(svg.node());
}

//Initialize selection dropdowns
const groupings = ["Location", "Sector", "Ransom Paid", "Year", "None"];
const groupingsMap = {"Location": ["continent", "country"], "Sector": ["sector"], "Ransom Paid": ["ransom_paid"], "Year" : ["year"], "None": []};
var groupingDepth = 4;

var selectedOption1 = "Location";
var selectedOption2 = "None";
var selectedOption3 = "None";

d3.select("#selectionMenu1")
  .selectAll("option")
  .data(groupings)
  .enter()
  .append("option")
  .text(function(d) {return d;})
  .attr("value", function(d) {return d;});

d3.select("#selectionMenu1").on("change", function(d) {
  selectedOption1 = d3.select(this).property("value")
  
  var groupingList = [];
  var mapped1 = groupingsMap[selectedOption1];
  var mapped2 = groupingsMap[selectedOption2];
  var mapped3 = groupingsMap[selectedOption3];

  for (var i = 0; i < mapped1.length; i++) {
    groupingList.push(mapped1[i]);
  }
  for (var i = 0; i < mapped2.length; i++) {
    groupingList.push(mapped2[i]);
  }
  for (var i = 0; i < mapped3.length; i++) {
    groupingList.push(mapped3[i]);
  }
  groupingDepth = groupingList.length;

  createCircleChart(groupingList);
});

d3.select("#selectionMenu2")
  .selectAll("option")
  .data(groupings)
  .enter()
  .append("option")
  .text(function(d) {return d;})
  .attr("value", function(d) {return d;})
  .property("selected", function(d) {return d === "None";});

d3.select("#selectionMenu2").on("change", function(d) {
  selectedOption2 = d3.select(this).property("value")
  
  var groupingList = [];
  var mapped1 = groupingsMap[selectedOption1];
  var mapped2 = groupingsMap[selectedOption2];
  var mapped3 = groupingsMap[selectedOption3];

  for (var i = 0; i < mapped1.length; i++) {
    groupingList.push(mapped1[i]);
  }
  for (var i = 0; i < mapped2.length; i++) {
    groupingList.push(mapped2[i]);
  }
  for (var i = 0; i < mapped3.length; i++) {
    groupingList.push(mapped3[i]);
  }
  groupingDepth = groupingList.length;

  createCircleChart(groupingList);
});

d3.select("#selectionMenu3")
  .selectAll("option")
  .data(groupings)
  .enter()
  .append("option")
  .text(function(d) {return d;})
  .attr("value", function(d) {return d;})
  .property("selected", function(d) {return d === "None";});

d3.select("#selectionMenu3").on("change", function(d) {
  selectedOption3 = d3.select(this).property("value")
  
  var groupingList = [];
  var mapped1 = groupingsMap[selectedOption1];
  var mapped2 = groupingsMap[selectedOption2];
  var mapped3 = groupingsMap[selectedOption3];

  for (var i = 0; i < mapped1.length; i++) {
    groupingList.push(mapped1[i]);
  }
  for (var i = 0; i < mapped2.length; i++) {
    groupingList.push(mapped2[i]);
  }
  for (var i = 0; i < mapped3.length; i++) {
    groupingList.push(mapped3[i]);
  }
  groupingDepth = groupingList.length;

  createCircleChart(groupingList);
});

createCircleChart(["continent", "country"]);


//----------------------------------------------------------------
//
// HISTOGRAM GRAPH CODE
//
//----------------------------------------------------------------

var svg;

var containerTypes = ["Year", "Month"];
var containerTypesMap = {"Year": "year", "Month": "month_code"};
var selectedOption4 = "Year";

d3.select("#selectionMenu4")
  .selectAll("option")
  .data(containerTypes)
  .enter()
  .append("option")
  .text(function(d) {return d;})
  .attr("value", function(d) {return d;})
  .property("selected", function(d) {return d === "Year";});

  d3.select("#selectionMenu4").on("change", function(d) {
    selectedOption4 = d3.select(this).property("value")
    
    var containerType = containerTypesMap[selectedOption4];
  
    createHistogram(filteredData, containerType);
  });

function createHistogram(data, grouping) {

  d3.select("#histogram").selectAll("svg").remove();

  const margin = {top: 10, right: 30, bottom: 45, left: 40};
  const width = 500;
  const height = 350;

  svg = d3.select("#histogram")
    .append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

  var min = grouping == "year" ? 2012.5 : 0.5;
  var max = grouping == "year" ? 2023 : 12.5;

  var tickLabelsMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var tickLabelsYear = ["2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023"];
  var tickLabels = grouping == "year" ? tickLabelsYear : tickLabelsMonth;

  const x = d3.scaleLinear()
    .domain([min, parseInt(max) + 1])
    .range([0, width - margin.left - margin.right]);
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom - margin.top})`)
    .call(d3.axisBottom(x).tickFormat((d, i) => tickLabels[i]));

  //add axis label
  svg.append("text")
    .attr("transform", `translate(${(width - margin.left - margin.right) / 2 - 8}, ${height - margin.bottom - margin.top + 40})`)
    .style("text-anchor", "middle")
    .text(grouping == "year" ? "Year" : "Month");

  //remove end tick of x-axis
  svg.selectAll(".tick")
    .filter(d => d === 2024 || d === 13)
    .remove();

  var histogram = d3.histogram()
    .value(d => grouping == "year" ? d.year : d.month_code)
    .domain(x.domain())
    .thresholds(x.ticks(max - min + 1));

  var bins = histogram(data);

  var y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .range([height - margin.bottom - margin.top, 0]);
  svg.append("g")
    .call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
      .attr("x", 1)
      .attr("transform", d => `translate(${x(d.x0 - 0.5)}, ${y(d.length)})`)
      .attr("width", d => x(d.x1) - x(d.x0) - 1)
      .attr("height", d => height - margin.bottom - margin.top - y(d.length))
      .style("fill", "#64dbea")
      .attr("rx", 3)
      .attr("ry", 3);
}

createHistogram(filteredData, "year");

//----------------------------------------------------------------
//
// PIE CHART CODE
//
//----------------------------------------------------------------

function createPieChart(dataPreGrouped) {

  var ransomPaidData = dataPreGrouped.filter(d => d.ransom_paid == "ransom paid");
  var refusedData = dataPreGrouped.filter(d => d.ransom_paid == "refused");
  var unknownData = dataPreGrouped.filter(d => d.ransom_paid == "unknown");

  var ransomPaidPercent = ransomPaidData.length / dataPreGrouped.length;
  var refusedPercent = refusedData.length / dataPreGrouped.length;
  var unknownPercent = unknownData.length / dataPreGrouped.length;

  var data = [
    {name: `ransom paid` , value: ransomPaidData.length, percent: ransomPaidPercent},
    {name: `ransom refused`, value: refusedData.length, percent: refusedPercent},
    {name: `unknown`, value: unknownData.length, percent: unknownPercent}
  ];

  // Remove any data with a value of 0
  data = data.filter(d => d.value > 0);

  // for (var i = 0; i < data.length; i++) {
  //   if (data[i].value == 0) {
  //     data.splice(i, 1);
  //     i--;
  //   }
  // }

  // Specify the chart’s dimensions.
  const width = 928;
  const height = Math.min(width, 500);

  const color = d3.scaleOrdinal()
    .domain([`ransom paid`, `ransom refused`, `unknown`])
    .range(["#FFB000", "#e25097", "#d9d9d9"]);

  // Create the pie layout and arc generator.
  const pie = d3.pie()
      .sort(null)
      .value(d => d.value);

  const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(Math.min(width, height) / 2 - 1);

  const labelRadius = arc.outerRadius()() * 0.8;

  // A separate arc generator for labels.
  const arcLabel = d3.arc()
      .innerRadius(labelRadius)
      .outerRadius(labelRadius);

  const arcs = pie(data);

  d3.select("#pieChart").selectAll("svg").remove();

  // Create the SVG container.
  const svg = d3.select("#pieChart").append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 15px sans-serif;");

  // Add a sector path for each value.
  svg.append("g")
      .attr("stroke", "white")
    .selectAll()
    .data(arcs)
    .join("path")
      .attr("fill", d => color(d.data.name))
      .attr("d", arc)
    .append("title")
      .text(d => `${d.data.name}: ${d.data.value.toLocaleString("en-US")}`);

  // Create a new arc generator to place a label close to the edge.
  // The label shows the value if there is enough room.
  svg.append("g")
      .attr("text-anchor", "middle")
    .selectAll()
    .data(arcs)
    .join("text")
      .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
      .call(text => text.append("tspan")
          .attr("y", "-0.4em")
          .attr("font-weight", "bold")
          .text(d => d.data.name))
      .call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
          .attr("x", 0)
          .attr("y", "0.7em")
          .attr("fill-opacity", 0.7)
          .text(d => d.data.value.toLocaleString("en-US") + " (" + Math.round(d.data.percent * 100) + "%)"));
}

createPieChart(newData);