
import os

file_path = '/Users/shingyeeang/.gemini/antigravity/scratch/MyBudgetApp/App.js'

# New calculateNetWorthHistory content
new_history_calc = """  // --- Helper: Net Worth History Calculation (Phase 16) ---
  const calculateNetWorthHistory = () => {
    const today = new Date();
    const dates = [];
    // Start with current Total Net Worth (Assets + Goals)
    let currentNetWorth = assets.reduce((acc, item) => acc + parseFloat(item.balance), 0) +
      goals.reduce((acc, item) => acc + parseFloat(item.savedAmount), 0);

    // 1. Generate last 30 days dates
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.unshift(d.toISOString().split('T')[0]);
    }

    // 2. Map date to daily net change (ALL transactions)
    const dailyChange = {};
    transactions.forEach(t => {
      const dateStr = t.date.split('T')[0];
      if (!dailyChange[dateStr]) dailyChange[dateStr] = 0;
      
      let change = 0;
      if (t.type === 'income') change = t.amount;
      else if (t.type === 'expense') change = -t.amount;
      // Transfer logic: within assets, net change is 0. 
      // But if transfer to Goal? Goal is part of Net Worth so 0 too.
      // If transfer is external? expense.
      
      dailyChange[dateStr] += change;
    });

    const reversedDates = [...dates].reverse();
    const historyMap = {};
    let runningBalance = currentNetWorth;

    reversedDates.forEach(dateStr => {
      historyMap[dateStr] = runningBalance;
      const change = dailyChange[dateStr] || 0;
      runningBalance = runningBalance - change; 
    });

    // Return labels every 6 days (5 labels for 30 days)
    const labels = dates.filter((_, i) => i % 6 === 0).map(d => {
       const [year, month, day] = d.split('-');
       return `${month}/${day}`;
    });

    return {
      labels: labels,
      datasets: [{ data: dates.map(d => historyMap[d] || 0) }]
    };
  };"""

# New renderAssetsScreen content (with updated chart config)
new_render_assets = """  const renderAssetsScreen = () => {
    const netWorthData = calculateNetWorthHistory();
    const totalLiabilities = assets.filter(a => a.balance < 0).reduce((acc, a) => acc + a.balance, 0); 
    const totalAssets = assets.filter(a => a.balance >= 0).reduce((acc, a) => acc + a.balance, 0) +
      goals.reduce((acc, g) => acc + g.savedAmount, 0);
    const netWorth = totalAssets + totalLiabilities;
    const screenWidth = Dimensions.get("window").width;

    // Vibrant Palette for Pie Chart
    const CHART_COLORS = [
      '#4ADE80', '#60A5FA', '#F472B6', '#A78BFA', '#FBBF24', 
      '#2DD4BF', '#FB7185', '#34D399', '#818CF8', '#FB923C'
    ];

    // Asset Breakdown Data
    const positiveAssets = assets.filter(a => a.balance > 0);
    const totalPositiveValue = positiveAssets.reduce((acc, a) => acc + a.balance, 0);
    
    const pieData = positiveAssets.map((asset, index) => {
      const percentage = ((asset.balance / totalPositiveValue) * 100).toFixed(1);
      return {
        name: `${percentage}% ${asset.name}`, 
        population: asset.balance,
        color: CHART_COLORS[index % CHART_COLORS.length], 
        legendFontColor: "#CBD5E1",
        legendFontSize: 12
      };
    }).sort((a, b) => b.population - a.population);

    return (
      <LinearGradient
        colors={['#0F172A', '#1E3A5F']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 24, paddingTop: 10 }]}>我的资产</Text>
          
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={{ paddingHorizontal: 24 }}>
              
              {/* 1. SEPARATED Header: Net Worth Card */}
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 24,
                padding: 20, 
                marginBottom: 15,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
              }}>
                <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', letterSpacing: 1 }}>总净资产 (NET WORTH)</Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginVertical: 8 }}>
                  RM {netWorth.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, paddingHorizontal: 10 }}>
                  <View>
                    <Text style={{ color: '#64748B', fontSize: 12 }}>总资产 Assets</Text>
                    <Text style={{ color: '#4ADE80', fontSize: 16, fontWeight: 'bold' }}>
                       {totalAssets.toLocaleString()}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'right' }}>总负债 Liabilities</Text>
                    <Text style={{ color: '#F87171', fontSize: 16, fontWeight: 'bold', textAlign: 'right' }}>
                       {Math.abs(totalLiabilities).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2. SEPARATED Graph Card */}
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 24,
                padding: 10, 
                marginBottom: 20,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
                overflow: 'hidden'
              }}>
                 <LineChart
                  data={netWorthData}
                  width={screenWidth - 48 - 20} // Subtract padding
                  height={180} // Increased height for visibility
                  yAxisLabel="RM "
                  yAxisSuffix="k"
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  formatYLabel={(y) => (parseFloat(y) / 1000).toFixed(1)} 
                  chartConfig={{
                    backgroundColor: "transparent",
                    backgroundGradientFromOpacity: 0,
                    backgroundGradientToOpacity: 0,
                    fillShadowGradientFrom: '#6366F1',
                    fillShadowGradientTo: '#1E1E1E',
                    fillShadowGradientOpacity: 0.5,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(129, 140, 248, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                    propsForDots: { r: "3", strokeWidth: "2", stroke: "#818CF8" },
                    propsForBackgroundLines: { stroke: "rgba(255,255,255,0.1)", strokeDasharray: "" }
                  }}
                  bezier
                  style={{ marginTop: 10, borderRadius: 16 }}
                />
              </View>

              {/* 3. Assets List Grid */}
              <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 15, color: '#E2E8F0' }]}>账户列表</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {assets.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      width: '48%', marginBottom: 15,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: 16,
                      padding: 15,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
                    }}
                    onPress={() => { setActiveAsset(item); setCurrentPage('asset_detail'); }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                       <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
                         <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                       </View>
                    </View>
                    <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>{item.name}</Text>
                    <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' }}>RM {item.balance.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
                
                {/* Add Asset Button */}
                <TouchableOpacity
                  style={{
                    width: '48%', height: 110, marginBottom: 15,
                    borderRadius: 16,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed',
                    justifyContent: 'center', alignItems: 'center'
                  }}
                  onPress={() => {
                    setNewAssetName(''); setNewAssetBalance(''); setNewAssetIcon('💰');
                    setEditingAssetId(null); setAssetModalVisible(true);
                  }}
                >
                  <Text style={{ fontSize: 24, color: '#64748B', marginBottom: 5 }}>+</Text>
                  <Text style={{ color: '#64748B', fontSize: 12 }}>添加账户</Text>
                </TouchableOpacity>
              </View>

              {/* 4. Improved Asset Distribution Pie Chart */}
              {positiveAssets.length > 0 && (
                <View style={{ marginTop: 20, marginBottom: 30, alignItems: 'center' }}>
                  <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 15, color: '#E2E8F0', alignSelf: 'flex-start' }]}>资产分布</Text>
                  <PieChart
                    data={pieData}
                    width={screenWidth - 48}
                    height={200} 
                    chartConfig={{
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    absolute
                  />
                </View>
              )}

            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  };"""

with open(file_path, 'r') as f:
    lines = f.readlines()

# Replace calculateNetWorthHistory (find start/end lines)
# Lines ~871 to 947
start_line_history = 870 
end_line_history = 947
lines[start_line_history:end_line_history+1] = [new_history_calc + '\n']

# Replace renderAssetsScreen
# Lines ~1068 to 1241
# Search for renderAssetsScreen again as line numbers shifted? 
# To be safe, let's find the line numbers in Python.

with open(file_path, 'w') as f:
    f.writelines(lines)

# Re-read to find renderAssetsScreen dynamically
with open(file_path, 'r') as f:
    lines = f.readlines()

render_start = -1
render_end = -1

for i, line in enumerate(lines):
    if "const renderAssetsScreen = () => {" in line:
        render_start = i
    if render_start != -1 and "const renderMonthPickerModal = () => {" in line:
        # The function ends before the next one starts.
        render_end = i - 1 
        break

if render_start != -1 and render_end != -1:
    # Need to verify if there's blank lines or comments in between.
    # Safe replacement from render_start to render_end
    lines[render_start:render_end] = [new_render_assets + '\n']
    
    with open(file_path, 'w') as f:
        f.writelines(lines)
    print("Successfully updated graph logic and asset screen.")
else:
    print(f"Could not find renderAssetsScreen boundaries. Start: {render_start}, End: {render_end}")

