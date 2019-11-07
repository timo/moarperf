import React from "react";
import {numberFormatter} from "./RoutinePieces";
import {Bytes} from "./AllocationViewer";

export const isFromRakudoCore = (scdesc, name) => (
    (scdesc === "gen/moar/CORE.setting"
        || scdesc === "gen/moar/CORE.c.setting"
        || scdesc === "gen/moar/CORE.d.setting"
        || scdesc === "gen/moar/CORE.e.setting"
        || scdesc === "gen/moar/BOOTSTRAP.nqp"
        || scdesc === "gen/moar/stage2/NQPHLL.nqp"
        || scdesc === "gen/moar/stage2/NQPCORE.nqp"
        || scdesc === "gen/moar/stage2/NQPCORE.setting"
        || scdesc === "gen/moar/stage2/QRegex.nqp")
    && !name.startsWith("BOOT") && !name.startsWith("NQP")
    && !name.startsWith("Rakudo::Iterator") && !name.startsWith("Rakudo::Internals")
)

export function AllocNameAndRepr({alloc}) {
    return (<td>{alloc.name}
        {isFromRakudoCore(alloc.scdesc, alloc.name) ? function () {
            return (
                <small><a rel="noopener noreferrer" target="_blank" href={"https://doc.perl6.org/type/" + alloc.name}>
                    {" "}Docs
                </a></small>
            )
        }() : ""}<br/>
        {alloc.repr !== "P6opaque" ? <small>{alloc.repr}</small> : ""}</td>)
}

export function AllocTableContent({allocations, parentSpeshJitEntries = 0, parentBareEntries = 0, parentSites = 0}) {

    return allocations.map((alloc) => {
        const bareAllocs = alloc.count - alloc.jit - alloc.spesh;
        return (
            <tr key={"alloc_" + alloc.name}>
                {
                    parentSites !== 0 && typeof alloc.participants !== "undefined" &&
                    <td>
                        {alloc.participants.split(",").length} / <small>{parentSites}</small> sites
                    </td>
                }
                <AllocNameAndRepr alloc={alloc} />
                <td>
                    <Bytes size={alloc.managed_size} totalCount={alloc.count} extraData={alloc.has_unmanaged_data} />
                </td>
                {
                    parentSpeshJitEntries === 0 && parentBareEntries !== 0
                        ?
                        <td>
                            {numberFormatter(bareAllocs)}×
                            {parentBareEntries > 0 && <React.Fragment>
                                <br/>
                                <small>{numberFormatter(bareAllocs / (parentBareEntries - parentSpeshJitEntries), 2)}× <small>per
                                    entry</small></small>
                            </React.Fragment>}
                        </td>
                        :
                        <React.Fragment>
                            <td>
                                {numberFormatter(bareAllocs)}× <small> before spesh</small>
                                {parentBareEntries > 0 && <React.Fragment>
                                    <br/>
                                    <small>{numberFormatter(bareAllocs / (parentBareEntries - parentSpeshJitEntries), 2)}× <small>per
                                        regular entry</small></small>
                                </React.Fragment>}
                            </td>
                            <td>
                                {numberFormatter(alloc.spesh + alloc.jit)}× <small>after spesh/jit</small>
                                {parentSpeshJitEntries > 0 && <React.Fragment>
                                    <br/>
                                    <small>{numberFormatter((alloc.spesh + alloc.jit) / parentSpeshJitEntries, 2)}× <small> per
                                        spesh/jit
                                        entry</small>
                                    </small>
                                </React.Fragment>
                                }
                            </td>
                        </React.Fragment>
                }
            </tr>
        );
    })
}

