


const update_cart_recommendations = () => {


    fetch('/update_cart_recommendations',{
        method:'POST',
        credentials:'include',
        headers:{
            "Content-Type": "application/x-www-form-urlencoded",
            //"X-CSRFToken": csrftoken,
            "protocol":"init"
        },

        body:JSON.stringify({

        })
    })
    .then(response => {
        return response.json(); // albo .text(), .blob(), .formData() jak chcesz
    })
    .then(data => {
        let result=data
    })


}






const read_cart_recommendations = () => {


    fetch('/get_cart_based_recomendation',{
        method:'GET',
        credentials:'include',
        headers:{
            "Content-Type": "application/x-www-form-urlencoded",
            //"X-CSRFToken": csrftoken,
            "protocol":"init"
        },

        body:JSON.stringify({

        })
    })
    .then(response => {
        return response.json(); // albo .text(), .blob(), .formData() jak chcesz
    })
    .then(data => {
        let result=data
    })


}



// update_cart_recommendations()
read_cart_recommendations()

