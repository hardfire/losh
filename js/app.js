var url = 'http://dl.dropboxusercontent.com/u/60336235/NLS/NLS.html';
//var url = 'http://losh-timing.ap01.aws.af.cm/';

function mainCtrl($scope,$rootScope,$http,$timeout){
	
	var forceUpdate = 1363531507;
	//check if data is available in localStorage
	var schedule = localStorage.getItem('schedule');
	var current = localStorage.getItem('current');
	var lastUpdated = localStorage.getItem('lastUpdated');

	var updateTime = 86400; //a day

	//if default group is not set, set as 1
	if(current == null)
	{
		localStorage.setItem('current','1');
		current = '1';
	}

	//if the schedule is not found in localstorage
	if(schedule == null)
	{
		updateSchedule();
	} else {

		//get the schedule and deafult group from storage
		$scope.schedule = JSON.parse(schedule);
		$scope.current = $scope.schedule[current];
		$scope.currentGroupNumber = current;

		updateTick();

		//check if schedule has not been updated in a day
		var now = new Date().getTime()/1000;
		if((now-lastUpdated) > updateTime || lastUpdated == null || lastUpdated < forceUpdate)
		{
			updateSchedule();
		}
		
	}


	//update the status of loadshedding
	function updateTick(){

		var date = new Date(),
			day = date.getDay(),
			nowStart = parseInt(moment().startOf('day').format('X'));
			now = moment().format('X') - nowStart,
			found = false,
			minStart = false,
			today = $scope.schedule[$scope.currentGroupNumber][day];


		for(var item in today['timing']){
			
			var start = today['timing'][item][0].timestamp,
			end = today['timing'][item][1].timestamp;

			if(now > start && now < end)
			{
				found = moment((end + nowStart).toString(),'X').fromNow();
			} else if(now < start && ( (minStart !== false && start < minStart) || minStart === false ) ){
				minStart = start;
			}

		}

		if(found !== false)
			$scope.status = 'Ends ' + found;
		else if(minStart !== false){
			$scope.status='Begins ' + moment((minStart+nowStart).toString(),'X').fromNow();
		} else {
			$scope.status ="Done for the day! yay!";
		}


		//update the current time
		$scope.currentTime = {
			hours:parseInt(moment().format('h')) + moment().format('m')/60,
			minutes:moment().format('m'),
			seconds:moment().format('s'),
			day:day
		}


		$scope.tickPromise = $timeout(updateTick,1000);
	};

	//change the group
	$scope.changeGroup = function(group){
		if(group === undefined){
			group = localStorage.getItem('current');
		}
		$scope.current = $scope.schedule[group];
		$scope.currentGroupNumber = group;
	}

	//set the default storage
	$scope.setDefaultGroup = function(){
		localStorage.setItem('current',$scope.currentGroupNumber);
		$scope.notification = {
			status:1,
			message:'Your default group has been set to <strong>Group '+$scope.currentGroupNumber+'</strong>'
		}
		$timeout($scope.hideNotify,2000);
	}

	//hide notify
	$scope.hideNotify = function(){
		$scope.notification=null;
	}


	/*
	 * Update the schedule from the server
	 */
	function updateSchedule(){
		
		$http.defaults.useXDomain = true;
		$http.get(url).success(function(data){
			data = data.replace(/Wednesda/g,'Wednesday'); 

			var parser = new DOMParser(),
			doc = parser.parseFromString(data,"text/html"),
			schedule = {};

			var date = new Date();
			var day = date.getDay();

			var current = 1;

			_.each(doc.getElementsByTagName('RESULTS')[0].children,function(el){

				if(schedule[el.children[0].innerHTML] == undefined)
				{
					schedule[el.children[0].innerHTML] = [];
				}

				var timing = el.children[2].innerHTML.split(','),
				group = el.children[0].innerHTML;

				for(var i=0,l=timing.length;i<l;i++) {
					timing[i] = timing[i].split("-");
					var newTime = [];
					for (var item in timing[i]) {
						var timeArray = timing[i][item].split(':'),
						timeMoment = moment().startOf('day').add({hours:timeArray[0],minutes:timeArray[1]});
						newTime.push({
							formatted : timeMoment.format('hh:mm a'),
							timestamp : timeMoment.format('X') - moment().startOf('day').format('X')
						});
					}
					timing[i] = newTime;
				}

				moment().startOf('day').add({hours:timeArray[0],minutes:timeArray[1]}).format('hh:mm a');
				schedule[group].push({
					day : el.children[1].innerHTML,
					timing : timing
				});

				if(schedule[group].length - 1 == day){
					schedule[group][day]['today'] = "today";
				}

			});

			$scope.schedule = schedule;
			$scope.current = schedule[current];
			$scope.currentGroupNumber = '1';

			localStorage.setItem('schedule',JSON.stringify(schedule));
			var lastUpdateTime = new Date().getTime()/1000;
			localStorage.setItem('lastUpdated',lastUpdateTime);
			updateTick();

			$scope.notification = {
				status:1,
				message:'LoadShedding Schedule has been <strong>Updated</strong>'
			}
			$timeout($scope.hideNotify,4000);

		}).error(function(data, status, headers, config) {
			alert('Cannot download latest schedule, please try again in some time');
		  // called asynchronously if an error occurs
		  // or server returns response with an error status.
		});
	}
}

