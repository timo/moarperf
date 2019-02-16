import Dimensions from "react-dimensions";
import {FlameGraph} from "react-flame-graph";
import React from "react";

export const AutoSizedFlameGraph = Dimensions()(({containerWidth, height, data, onChange}) => {
    console.log("autosized flamegraph with width", containerWidth);
    return (
        <FlameGraph data={data} width={containerWidth} height={height} onChange={onChange}/>
    )
});

export function postprocessFlameGraphData(data, routineMetadata) {
    var depth = 1;
    if (typeof routineMetadata === "undefined" || routineMetadata.length == 0) {
        return {name: "no data loaded yet", value: 1024};
    }
    function recurseLookup(node, curDepth) {
        if (curDepth > depth) {
            depth = curDepth;
        }
        if (node.hasOwnProperty('incomplete')) {
            return ({
                ...node,
                name: (routineMetadata[node.rid] || {name: "?"}).name,
                tooltip: node.cid + ": " + (routineMetadata[node.rid] || {name: "?"}).name,
                children: node.incomplete ? [{
                    name: "[more]",
                    tooltip: node.cid + " has more children...",
                    routine_id: node.rid,
                    value: node.value,
                    backgroundColor: "#999",
                    color: "#fff",
                }] : [],
                incomplete: node.incomplete
            });
        }
        return ({
            ...node,
            tooltip: node.cid + ": " + (routineMetadata[node.rid] || {name: "?"}).name,
            name: (routineMetadata[node.rid] || {name: "?"}).name,
            children:
                node.hasOwnProperty('children') ?
                node.children.map(recurseLookup, curDepth + 1)
                    : []
        });
    }
    return {flamegraph: recurseLookup(data, 1), maxDepth: depth};
}