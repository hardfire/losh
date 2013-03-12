var url = 'http://losh.ap01.aws.af.cm/?src=dl.dropbox.com/u/60336235/NLS/NLS.html';

function mainCtrl($scope,$rootScope,$http,$timeout){

	//check if data is available in localStorage
	var schedule = localStorage.getItem('schedule');
	var current = localStorage.getItem('current');
	if(current == null)
	{
		current = '1';
	}
	if(schedule == null)
	{
		console.log('getting the data from the server');
		updateSchedule();
	} else {
		$scope.schedule = JSON.parse(schedule);
		$scope.current = $scope.schedule[current];
		$scope.currentGroupNumber = current;
		updateTick();
	}

	//update the status of loadshedding
	function updateTick(){
		var date = new Date(),
		day = date.getDay(),
		now = moment().format('X'),
		found = false,
		minStart = false,
		today = $scope.schedule[$scope.currentGroupNumber][day];

		for(var item in today['timing']){

			var start = today['timing'][item][0].timestamp,
			end = today['timing'][item][1].timestamp;

			if(now > start && now < end)
			{
				found = moment(end,'X').fromNow();
			} else if(now < start && ( (minStart !== false && start < minStart) || minStart === false ) ){
				minStart = start;
			}
		}

		if(found !== false)
			$scope.status = 'End ' + found;
		else if(minStart !== false){
			$scope.status='Begin ' + moment(minStart,'X').fromNow();
		} else {
			$scope.status ="Done for the day! yay!";
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

	//update the schedule from the server

	function updateSchedule(){

		$http({ method:'GET', url:url}).success(function(data){

			data = data.replace(/Wednesda/g,'Wednesday'); 

			var parser = new DOMParser(),
			doc = parser.parseFromString(data,"text/html"),
			schedule = {};

			var date = new Date();
			var day = date.getDay();

			var current = 1;

			_.each(doc.getElementsByTagName('results')[0].children,function(el){

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
							timestamp : timeMoment.format('X')
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
			updateTick();

			$scope.notification = {
				status:1,
				message:'LoadShedding Schedule has been <strong>Updated</strong>'
			}
			$timeout($scope.hideNotify,4000);

		});
	}
}
