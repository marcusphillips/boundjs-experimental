test('Proxied objects have standard methods', function(){
  same(bound(alice).get('name'), 'alice', 'proxy has a working getter function');
  bound(alice).set('name', 'alison');
  same(alice.name, 'alison', 'proxy has a working getter function');
  alice.greet = function(){ return 'I am '+this.name; };
  same(alice.bound('run', 'greet'), 'I am alison', 'runner works');
});

test('Proxied objects can have dependant properties', function(){
  bound(alice).property('salutation', function(){
    return this('title') + '. ' + this('name');
  });
  same(alice.salutation, 'Ms. alice', 'property was calculated');
  alice.title = 'Mrs';
  bound(alice).changed('title');
  same(alice.salutation, 'Mrs. alice', 'property was recalculated');
});


test('Proxied objects can depend on the properties of other objects', function(){
  bound(alice).property('greeting', function(){
    return 21 < this(bob, 'age') ? 'hello sir' : 'hey dude';
  });
  same(alice.greeting, 'hey dude', 'property was calculated');
  bob.age++;
  bound(bob).changed('age');
  same(alice.greeting, 'hello sir', 'property was calculated');
});

test('Proxied objects can depend on method calls', function(){
  bound(alice).property('salutation', function(){
    return this('title') + '. ' + this('name');
  });
  bound(alice).method('greeting', function(){
    return 21 < this(bob, 'age') ? 'hello sir' : 'hey dude';
  });
  same(alice.greeting(), 'hey dude', 'method was calculated');

  bound(alice).property('introduction', function(){
    return this('greeting', []) + ', I\'m ' + this('salutation');
  });
  same(alice.introduction, 'hey dude, I\'m Ms. alice', 'property was calculated');
  bob.age++;
  bound(bob).changed('age');
  same(alice.introduction, 'hello sir, I\'m Ms. alice', 'property was calculated');
});
