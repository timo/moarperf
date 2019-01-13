import Dimensions from "react-dimensions";
import {FlameGraph} from "react-flame-graph";
import React from "react";

export const AutoSizedFlameGraph = Dimensions()(({containerWidth, height, data, onChange}) => {
    console.log("autosized flamegraph with width", containerWidth);
    return (
        <FlameGraph data={data} width={containerWidth} height={height} onChange={onChange}/>
    )
});