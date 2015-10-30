(function() {
    'use strict';

    angular.module('devoxx').controller('EndGameCtrl', EndGameCtrl);

    EndGameCtrl.$inject =['$scope', '$location', '$mdDialog','$window'];

    function EndGameCtrl($scope, $location, $mdDialog,$window) {
        console.log("EndGameCtrl loaded");

        $scope.name = window.sessionStorage.getItem('name');
        $scope.winner = function (){
            return window.sessionStorage.getItem('winner') == 1;
        }

        $scope.newGame = function() {
            $mdDialog.hide();
            window.sessionStorage.clear();
            //$window.location.reload();
        }
    }
})();
