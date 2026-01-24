'use client'
import {useEffect, useState} from 'react'
import { base_fetch } from '@/app/app_conf'
import { useParams } from 'next/navigation'
import RoomProtectedPrompt from '../comps/room_protected_prompt'


type room_data_props = {
    'room_found': boolean,
    'ROOM_PROTECTED': boolean,
    'ALLOW_USER': boolean,
}


const does_room_exists = async(room_id: string): Promise<room_data_props> => {
    const response = await fetch(base_fetch + '/does_room_exists' + `/?received_room_id=${room_id}`, {credentials:'include'})
    const data = await response.json()
    console.log(data)
    if(!data || data.room_found === false) {
        window.open('/lobby','_self')
    }
   return data
}


const View = () => {


    const [roomData,SetRoomData] = useState<room_data_props|null> (null)

    const params = useParams()

    
    useEffect(()=>{
        const loadRoom = async () => {
            const data = await does_room_exists(String(params.room_id))
            SetRoomData(data)
        }

        loadRoom()
    },[params.room_id])

    const handleRoomLogin = async (password: string) => {
        const roomId = String(params.room_id)
        try {
            const response = await fetch(base_fetch + '/check_room_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials:'include',
                body: JSON.stringify({
                    received_room_id: roomId,
                    received_passwd: password,
                }),
            })

            if (!response.ok) {
                return
            }

            const data = await response.json().catch(() => null)

            if (data && typeof data.ALLOW_USER === 'boolean') {
                SetRoomData((prev) => (prev ? { ...prev, ALLOW_USER: data.ALLOW_USER } : prev))
            }
            
            if(data && data.refresh){window.location.reload()}
        } catch (error) {
            console.error('Failed to verify room password', error)
        }
    }

    return (

        <>
        {roomData && !roomData.ALLOW_USER ? (
            <RoomProtectedPrompt onSubmit={handleRoomLogin} />
        ) : null}
        </>


    )
}

export default View
export {does_room_exists}