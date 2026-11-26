module.exports = ({ config }) => {
  if (process.env.MYBUDGETAPP_TEST_BUILD !== '1') return config;

  const scheme = 'mybudgetapp-test';
  return {
    ...config,
    name: 'MyBudgetApp Test',
    scheme,
    android: {
      ...config.android,
      package: 'com.shingyeeang.mybudgetapp.test',
      scheme,
      intentFilters: config.android.intentFilters.map(filter => ({
        ...filter,
        data: filter.data.map(data => ({ ...data, scheme })),
      })),
    },
  };
};
