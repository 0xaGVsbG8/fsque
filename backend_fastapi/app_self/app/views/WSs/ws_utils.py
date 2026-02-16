

ROOM_CONNECTIONS = {}


def count_occupancy(room_id):
    if room_id in ROOM_CONNECTIONS:
        return len(ROOM_CONNECTIONS[room_id])
    return 0