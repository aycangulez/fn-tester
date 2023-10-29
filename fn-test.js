module.exports = fn = {
    test: { enabled: false, calls: [], doubles: [] }, // When enabled, function calls are recorded and doubles are used (if any)
    run: function () {
        const parentObj = arguments[0]; // To preserve 'this', we need the parent object
        const func = arguments[1] ? parentObj[arguments[1]] : parentObj; // Function to be called
        const argList = [].slice.call(arguments, 2); // Arguments to pass to the function
        let testDouble;
        if (fn.test.enabled) {
            fn.test.calls.push([func.name, ...argList]); // Record function calls
            testDouble = fn.test.doubles.find((double) => double.name === func.name); // See if there is a test double for this function
        }
        return testDouble ? testDouble.apply(testDouble, argList) : func.apply(parentObj, argList); // Call test double if there is one or the original function
    },
};
