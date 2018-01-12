'use strict';

const _ = require("underscore");
const builder = require('botbuilder');

module.exports = {
    getRestaurantsList: getRestaurantsList,
    restaurantAsAttachment: restaurantAsAttachment
}

function getRestaurantsList(foodName) {
    var restaurants = [
        { name: 'Jollibee', foodList: ['hamburger', 'hotdog', 'french fries', 'chicken'], rating: Math.ceil(Math.random() * 5), location: 'Bautista', logo: 'https://vignette.wikia.nocookie.net/logopedia/images/0/03/Jollibee_ph_logo.jpeg/revision/latest?cb=20130821014824' },
        { name: 'McDonalds', foodList: ['hamburger', 'french fries', 'chicken'], rating: Math.ceil(Math.random() * 5), location: 'Ayala', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Mcdonalds-90s-logo.svg/1280px-Mcdonalds-90s-logo.svg.png' },
        { name: 'Angels Burger', foodList: ['hamburger'], rating: Math.ceil(Math.random() * 5), location: 'Malate', logo: 'https://pbs.twimg.com/profile_images/431431104566808576/oh0MofVT.jpeg' }
    ];

    var filteredRestaurants = _.filter(restaurants, function (res) {
        return res.foodList.indexOf(foodName) > -1;
    });
    return filteredRestaurants;
}

function restaurantAsAttachment(restaurant) {
    return new builder.HeroCard()
        .title(restaurant.name)
        .subtitle('%d star(s) rating.', restaurant.rating)
        .images([new builder.CardImage().url(restaurant.logo)])
        .buttons([
            new builder.CardAction()
                .title('View in Google Maps')
                .type('openUrl')
                .value('https://www.google.com.ph/maps/search/' +
                encodeURIComponent(restaurant.name) + ' in ' + encodeURIComponent(restaurant.location))
        ]);
}