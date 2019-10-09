import {Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import React from "react";
import {numberFormatter} from "./SnapshotList";

type SnapshotIndex = number;

type HighscoreColumnData = { [string]: number };
type HighscoreInputData = [
    {
        frames_by_size: Array<HighscoreColumnData>,
        frames_by_count: Array<HighscoreColumnData>,
        types_by_size: Array<HighscoreColumnData>,
        types_by_count: Array<HighscoreColumnData>,
        frame_details: { [number]: { cuid: string, name: string, file: string, line: number } },
        type_details: { [number]: { name: string, repr: string } }
    }
];
type LineKey = string;
type HighscoreGraphData = {
    frames_by_size: Array<{
        snapshot: SnapshotIndex,
        [LineKey]: number,
    }>
};

export function HighscoreLineChart({highscores, dataKey: key, numberOfLines = 5}) {
    let data = highscores[key];
    var allKeys = {};
    var scorePerKey = {};

    if (typeof data === "undefined") {
        return <></>
    }

    for (let entry of data) {
        for (let innerKey in entry) {
            allKeys[innerKey] = 1;
            if (typeof scorePerKey[innerKey] === "undefined") {
                scorePerKey[innerKey] = 0;
            }
            scorePerKey[innerKey] += entry[innerKey];
        }
    }

    var keyList = [];
    for (let key in allKeys) {
        keyList.push(key);
    }

    keyList.sort((a, b) => (scorePerKey[b] - scorePerKey[a]));

    keyList = keyList.slice(0, numberOfLines);

    let startValue = 5;
    let endValue = 80;
    let valueStep = (endValue - startValue) / numberOfLines;

    return (
        <ResponsiveContainer height={300}>
            <LineChart data={data}>
                <XAxis/>
                <YAxis width={100} tickFormatter={numberFormatter}/>
                <CartesianGrid fill="white" horizontal={false} vertical={false}/>
                {
                    keyList.map((key, index) => (
                        <Line dataKey={key} key={key} dot={false}
                              stroke={"hsl(199, 90%, " + (valueStep * index) + "%)"}/>
                    ))
                }
                <Tooltip content={(stuff) => {
                    const outer = stuff.payload;
                    return (
                        <div style={{background: "#ddd"}}>
                            <ul>
                                {
                                    outer.map(val => (<li>{val.name}: {numberFormatter(val.value)}</li>))
                                }
                            </ul>
                        </div>
                    );
                }}/>
            </LineChart>
        </ResponsiveContainer>
    );
}

export function HighscoreGraphs(props: { value: number, onChange: (e: any) => void, highscores: any }) {
    return <div>
        <h2>Top <input value={props.value} onChange={props.onChange} style={{width: "5em"}}/> scores</h2>
        {
            typeof props.highscores === "undefined"
                ? <div>Waiting for results...</div>
                :
                <>
                    <h3>Top objects by size</h3>
                    <HighscoreLineChart highscores={props.highscores} dataKey={"types_by_size"}
                                        numberOfLines={props.value}/>
                    <h3>Top objects by count</h3>
                    <HighscoreLineChart highscores={props.highscores} dataKey={"types_by_count"}
                                        numberOfLines={props.value}/>
                    <h3>Top frames by size</h3>
                    <HighscoreLineChart highscores={props.highscores} dataKey={"frames_by_size"}
                                        numberOfLines={props.value}/>
                    <h3>Top frames by count</h3>
                    <HighscoreLineChart highscores={props.highscores} dataKey={"frames_by_count"}
                                        numberOfLines={props.value}/>
                </>
        }
    </div>;
}

export function SummaryGraphs(props: { data: any }) {
    return <div><h2>Summaries</h2>
        <h3>Total Heap Size</h3>
        <ResponsiveContainer height={200}>
            <BarChart data={props.data}>
                <XAxis dataKey={"gc_seq_num"}/>
                <YAxis width={100} tickFormatter={numberFormatter}/>

                <Bar dataKey={"total_heap_size"} fill={"#d43d51"}/>
            </BarChart>
        </ResponsiveContainer>
        <h3>Total Object Count</h3>
        <ResponsiveContainer height={200}>
            <BarChart data={props.data}>
                <Bar dataKey={"total_objects"} stackId={"objcount"} fill={"#00876c"}/>
                <XAxis dataKey={"gc_seq_num"}/>
                <YAxis width={100} tickFormatter={numberFormatter}/>

            </BarChart>
        </ResponsiveContainer>
        <h3>Typeobjects, STables, and Frames</h3>
        <ResponsiveContainer height={200}>
            <BarChart data={props.data}>
                <Bar dataKey={"total_typeobjects"} stackId={"objcount"} fill={"#87b174"}/>
                <Bar dataKey={"total_stables"} stackId={"objcount"} fill={"#e49158"}/>
                <Bar dataKey={"total_frames"} stackId={"objcount"} fill={"#d43d51"}/>
                <XAxis dataKey={"gc_seq_num"}/>
                <YAxis width={100} tickFormatter={numberFormatter}/>

            </BarChart>
        </ResponsiveContainer>
        <h3>References</h3>
        <ResponsiveContainer height={200}>
            <BarChart data={props.data}>
                <Bar dataKey={"total_refs"} fill={"#e49158"}/>
                <XAxis dataKey={"gc_seq_num"}/>
                <YAxis width={100} tickFormatter={numberFormatter}/>
            </BarChart>
        </ResponsiveContainer>
    </div>;
}