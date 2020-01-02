var app = angular.module('resume', [])
    .controller('personCtrl', function ($scope) {
        $scope.personInfo = {
            img: 'ash.jpg',
            name: 'Ashvini Jangid',
            description: 'Python and Django developer with some Sass',
            phone: {
                text: '969.949.78266',
                url: 'tel:+919694978266'
            },
            email: {
                text: 'ashvinijangid@gmail.com',
                url: 'mailto:ashvinijangid@gmail.com'
            },
            social: [{
                url: 'https://github.com/ashvinijangid',
                icon: 'fa-github fa-lg'
            }, {
                url: 'https://www.linkedin.com/in/ashvinijangid/',
                icon: 'fa-linkedin fa-lg'
            },]
        };
    })
    .controller('educationCtrl', function ($scope) {
        $scope.schools = [{
            name: 'Jaipur National University',
            program: 'Master of Computer Application',
            city: 'Jaipur',
            state: 'Rajasthan',
            stateAbbr: 'RAJ',
            dates: '5/2015 -'
        }, ];
    })
    .controller('languagesCtrl', function ($scope) {
        $scope.languages = [{
            name: 'Can Write code In',
            types: [
                'Python',
                'JavaScript',
                'C',
                'GO',
                'Kotlin',
                'Scss'

            ]
        },   {
            name: 'Advance Task',
            types: [
                'OpenCV',
                'NLP',
                'Data Processing',
                'Web Scarping',


            ]
        },{
            name: 'Backend ',
            types: [
                'Django',
                'Nginx',
                'Go',
                'Mysql',
                'MongoDB'
            ]
        }];
    })
    .controller('toolsCtrl', function ($scope) {
        $scope.tools = [{
                name: 'Also know',
                types: [
                'Git',
                'Docker',
                         

            ]
        }, {
                name: 'MQ',
                types: [
                'Celery',
                'Redis',
            ]
        }, {
                name: 'Graphic Tools',
                types: [
                'Power Point',
                'Adobe Photoshop',
            ]
        }, {
                name: 'Deployment',
                types: [
                'Heroku',
                'pythonanywhere',
                'AWS',
                'Digital Ocean',
            ]
        }, {
                name: 'Working',
                types: [
                'MAchine Learning',
                'RNN,CNN'
            ]
        },
         ];
    })
    .controller('organizationCtrl', function ($scope) {
        $scope.organizations = [
            {
                name: 'Exol lubricants',
                url: 'www.exollubricants.com',
                positions: [{
                    title: 'Back End Developer',
                    responsibilities: [
                        'Write all Tasks',
                        'Use Django to make interactive Page',
                        'Collaborate with team members on ideas for existing and new products',
                        'Version control with  Git'
                    ]
                }],
                dates: 'October 2017- December 2017'
        },
            {
                name: 'Teknuance',
                url: 'http://www.teknuance.com/',
                positions: [{
                    title: 'Reserach Analysis and Back end Developer',
                    responsibilities: [
                        'Build and contribute to hand-coded  websites and applications',
                        'Write semantic HTML5 and CSS for scalable and responsive layouts',
                        'Use MVC frameworks such as Django',
                        'Manage tasks with Celery',
                        'Version control with Git'
                    ]
                }],
                dates: 'October 2017 - January 2018'
        },
    ];
    })
    .controller('campsCtrl', function ($scope) {
        $scope.camps = [
            
            {
                name: 'Big-Data Seminar',
                url: '#',
                dates: 'March 22 2018',
                description: 'Along with Pyspark finaly know how hadoop works.'
        }
    ];
    });
