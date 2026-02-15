import { transfer_downloading, transfer_log_data_props } from "@/app/types"





type Transfer_log_props = {
    transfer_log_data: transfer_log_data_props[] | null
}

function capitalize(str: string) {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
}


const Transfer_log = ({transfer_log_data}:Transfer_log_props) => {


    // const data = [
    //     {'username': 'yoyo', 'filename': 'yoyo.txt', 'transfer_type': 'Uploading', 'perc': 20 }
    // ] as transfer_log_data_props[]

    return (
        <>
        {transfer_log_data && (

            <div>
                <div>Transfer log</div>
                {transfer_log_data.map((value, index)=>{
                    return (
                        <div key={index+value.filename}>
                            <div>
                                {capitalize(value.transfer_type) + 'ing'}: {value.filename} 
                                {value.transfer_type == 'download' ? ' from ' : ' to '} 
                                {value.username}
                            </div>
                            <div>{value.perc}%</div>
                            <button onClick={()=>value.cancel_behaviour?.()}>Cancel</button>
                        </div>
                    )
                })}

            </div>

        )}

        </>
    )


}

export default Transfer_log