import { useState } from "react"
import { transfer_downloading, transfer_log_data_props } from "../../../types"
import styles from './transfer_log.module.css'





type Transfer_log_props = {
    transfer_log_data: transfer_log_data_props[] | null
    ongoing_transfer_count: number
    set_ongoing_transfer_count: React.Dispatch<React.SetStateAction<number>>
}

function capitalize(str: string) {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
}


const Transfer_log = ({transfer_log_data, ongoing_transfer_count, set_ongoing_transfer_count}:Transfer_log_props) => {

    const [expanded, setExpanded] = useState(true)

    return (
        <>
        {transfer_log_data && (

            <div className={styles.container}>
                <div className={styles.titleRow}>
                    <span className={styles.title}>Transfer log ({ongoing_transfer_count})</span>
                    <button
                        onClick={() => setExpanded(prev => !prev)}
                        className={styles.toggleBtn}
                    >
                        {transfer_log_data.length > 0 && (expanded ? '▼' : '▲')}
                    </button>
                </div>

                {expanded && (
                    <div className={styles.list}>
                        {transfer_log_data.map((value, index) => {
                            const perc = Number(value.perc) || 0
                            return (
                                <div key={index + value.filename} className={styles.entry}>
                                    <div className={styles.entryInfo}>
                                        <span className={styles.entryType}>{capitalize(value.transfer_type) + 'ing'}</span>: <span className={styles.entryFilename}>| {value.filename} |</span>
                                        {value.transfer_type == 'download' ? ' from ' : ' to '}
                                        <span className={styles.entryUsername}>{value.username}</span>
                                    </div>

                                    <div className={styles.progressTrack}>
                                        <div
                                            className={`${styles.progressBar} ${perc >= 100 ? styles.progressBarDone : styles.progressBarActive}`}
                                            style={{ width: `${Math.min(perc, 100)}%` }}
                                        />
                                    </div>

                                    <div className={styles.footer}>
                                        <span className={perc >= 100 ? styles.percDone : styles.percActive}>
                                            {value.perc}%{value.extra_msg ? (
                                                <span className={value.extra_msg.toLowerCase().includes('cancel') ? styles.extraMsgCancel : styles.extraMsg}> {value.extra_msg}</span>
                                            ) : ''}
                                        </span>
                                        <button
                                            onClick={() => value.cancel_behaviour?.()}
                                            className={value.button_text === 'Clear' ? styles.clearBtn : styles.cancelBtn}
                                        >
                                            {value.button_text ?? 'Cancel'}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

            </div>

        )}

        </>
    )


}

export default Transfer_log